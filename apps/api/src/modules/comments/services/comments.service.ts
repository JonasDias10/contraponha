import { Inject, Injectable } from "@nestjs/common"
import {
  runTransaction,
  type Database,
  type DatabaseExecutor,
  type ReactionKindValue,
} from "@ponto/database"
import {
  ApiErrorCode,
  ContentRemoval,
  type CommentView,
  type ContentRevisionList,
  type Page,
} from "@ponto/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  isActiveComment,
  threadRootId,
  toCommentRevision,
  toCommentView,
  type ActiveComment,
  type Comment,
} from "#src/modules/comments/domain/comment.js"
import { CommentRevisionsRepository } from "#src/modules/comments/repositories/comment-revisions.repository.js"
import { CommentsRepository } from "#src/modules/comments/repositories/comments.repository.js"
import { isWithinEditWindow } from "#src/modules/posts/domain/edit-window.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const commentCursorSchema = z.object({ id: z.uuid() })

export interface CreateCommentParams {
  postId: string
  authorId: string
  body: string
  parentId: string | undefined
}

export interface ListPostCommentsParams {
  postId: string
  cursor: string | undefined
  limit: number
}

export interface ListCommentRepliesParams {
  commentId: string
  cursor: string | undefined
  limit: number
}

export interface UpdateCommentParams {
  commentId: string
  userId: string
  body: string
}

export interface DeleteCommentParams {
  commentId: string
  userId: string
}

export interface AdjustCommentReactionCountParams {
  commentId: string
  kind: ReactionKindValue
  delta: 1 | -1
  executor?: DatabaseExecutor
}

export interface RemoveCommentByModerationParams {
  commentId: string
  executor: DatabaseExecutor
}

interface RemoveCommentParams {
  comment: Comment
  removedBy: ContentRemoval
  executor: DatabaseExecutor
}

interface ResolveThreadRootParams {
  postId: string
  parentId: string | undefined
}

interface GetOwnedActiveCommentParams {
  commentId: string
  userId: string
}

interface ToPageParams {
  rows: Comment[]
  limit: number
}

@Injectable()
export class CommentsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly commentsRepository: CommentsRepository,
    private readonly revisionsRepository: CommentRevisionsRepository,
    private readonly postsService: PostsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create({ postId, authorId, body, parentId }: CreateCommentParams): Promise<CommentView> {
    const post = await this.postsService.getActivePost(postId)
    const root = await this.resolveThreadRoot({ postId, parentId })

    const comment = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const created = await this.commentsRepository.create({
          data: { postId, authorId, parentId: root?.id ?? null, body },
          executor: tx,
        })

        await this.postsService.adjustCommentCount({ postId, delta: 1, executor: tx })

        if (root)
          await this.commentsRepository.incrementReplyCount({ id: root.id, delta: 1, executor: tx })

        await this.notificationsService.notify({
          recipientId: root ? root.authorId : post.authorId,
          actorId: authorId,
          type: root ? "comment_replied" : "post_commented",
          postId,
          commentId: created.id,
          executor: tx,
        })

        return created
      },
    })

    const author = await this.usersService.getById(authorId)
    return toCommentView({ comment, author })
  }

  async listForPost({ postId, cursor, limit }: ListPostCommentsParams): Promise<Page<CommentView>> {
    await this.postsService.assertExists(postId)

    const position = decodeCursor({ cursor, schema: commentCursorSchema })

    const rows = await this.commentsRepository.listTopLevel({
      postId,
      afterId: position?.id,
      limit: limit + 1,
    })

    return this.toPage({ rows, limit })
  }

  async listReplies({
    commentId,
    cursor,
    limit,
  }: ListCommentRepliesParams): Promise<Page<CommentView>> {
    const parent = await this.commentsRepository.findById(commentId)

    if (!parent) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    const position = decodeCursor({ cursor, schema: commentCursorSchema })

    const rows = await this.commentsRepository.listReplies({
      parentId: threadRootId(parent),
      afterId: position?.id,
      limit: limit + 1,
    })

    return this.toPage({ rows, limit })
  }

  async update({ commentId, userId, body }: UpdateCommentParams): Promise<CommentView> {
    const comment = await this.getOwnedActiveComment({ commentId, userId })

    if (!isWithinEditWindow({ createdAt: comment.createdAt, now: new Date() }))
      throw new AppError(ApiErrorCode.EDIT_WINDOW_EXPIRED)

    const updated = await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.revisionsRepository.create({ commentId, body: comment.body, executor: tx })

        return this.commentsRepository.updateBody({ id: commentId, body, executor: tx })
      },
    })

    if (!updated) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    const author = await this.usersService.getById(userId)
    return toCommentView({ comment: updated, author })
  }

  async delete({ commentId, userId }: DeleteCommentParams): Promise<void> {
    const comment = await this.getOwnedActiveComment({ commentId, userId })

    await runTransaction({
      db: this.db,
      work: (tx) => this.remove({ comment, removedBy: ContentRemoval.AUTHOR, executor: tx }),
    })
  }

  // Runs inside the moderator's transaction so the removal and its audit entry commit together.
  async removeByModeration({
    commentId,
    executor,
  }: RemoveCommentByModerationParams): Promise<void> {
    const comment = await this.getActiveComment(commentId)

    await this.remove({ comment, removedBy: ContentRemoval.MODERATION, executor })
  }

  async listRevisions(commentId: string): Promise<ContentRevisionList> {
    await this.getActiveComment(commentId)

    const revisions = await this.revisionsRepository.listByComment(commentId)
    return { revisions: revisions.map(toCommentRevision) }
  }

  async isActive(commentId: string): Promise<boolean> {
    const comment = await this.commentsRepository.findById(commentId)
    return comment !== undefined && isActiveComment(comment)
  }

  async getActiveComment(commentId: string): Promise<ActiveComment> {
    const comment = await this.commentsRepository.findById(commentId)

    if (!comment || !isActiveComment(comment)) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return comment
  }

  adjustReactionCount({
    commentId,
    kind,
    delta,
    executor,
  }: AdjustCommentReactionCountParams): Promise<void> {
    return this.commentsRepository.incrementReactionCount({ id: commentId, kind, delta, executor })
  }

  private async resolveThreadRoot({
    postId,
    parentId,
  }: ResolveThreadRootParams): Promise<Comment | undefined> {
    if (!parentId) return undefined

    const parent = await this.getActiveComment(parentId)

    if (parent.postId !== postId) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    const rootId = threadRootId(parent)

    if (rootId === parent.id) return parent

    const root = await this.commentsRepository.findById(rootId)

    if (!root) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return root
  }

  private async remove({ comment, removedBy, executor }: RemoveCommentParams): Promise<void> {
    const isRemoved = await this.commentsRepository.softDelete({
      id: comment.id,
      removedBy,
      executor,
    })

    if (!isRemoved) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    await this.revisionsRepository.deleteByComment({ commentId: comment.id, executor })

    await this.postsService.adjustCommentCount({ postId: comment.postId, delta: -1, executor })

    if (comment.parentId) {
      await this.commentsRepository.incrementReplyCount({
        id: comment.parentId,
        delta: -1,
        executor,
      })
    }
  }

  private async getOwnedActiveComment({
    commentId,
    userId,
  }: GetOwnedActiveCommentParams): Promise<ActiveComment> {
    const comment = await this.getActiveComment(commentId)

    if (comment.authorId !== userId) throw new AppError(ApiErrorCode.FORBIDDEN)

    return comment
  }

  private async toPage({ rows, limit }: ToPageParams): Promise<Page<CommentView>> {
    const authors = await this.usersService.findByIds(rows.map((comment) => comment.authorId))

    return buildPage({
      rows,
      limit,
      toItem: (comment) => toCommentView({ comment, author: authors.get(comment.authorId) }),
      toCursor: (comment) => ({ id: comment.id }),
    })
  }
}
