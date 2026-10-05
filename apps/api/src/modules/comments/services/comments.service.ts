import { Inject, Injectable } from "@nestjs/common"
import type { Database, DatabaseExecutor, ReactionKindValue } from "@ponto/database"
import { ApiErrorCode, type CommentView, type ContentRevisionList, type Page } from "@ponto/types"
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
  ) {}

  async create({ postId, authorId, body, parentId }: CreateCommentParams): Promise<CommentView> {
    await this.postsService.getActivePost(postId)

    const rootId = await this.resolveThreadRoot({ postId, parentId })

    const comment = await this.db.transaction(async (tx) => {
      const created = await this.commentsRepository.create({
        data: { postId, authorId, parentId: rootId, body },
        executor: tx,
      })

      await this.postsService.adjustCommentCount({ postId, delta: 1, executor: tx })

      if (rootId)
        await this.commentsRepository.incrementReplyCount({ id: rootId, delta: 1, executor: tx })

      return created
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

    const updated = await this.db.transaction(async (tx) => {
      await this.revisionsRepository.create({ commentId, body: comment.body, executor: tx })

      return this.commentsRepository.updateBody({ id: commentId, body, executor: tx })
    })

    if (!updated) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    const author = await this.usersService.getById(userId)
    return toCommentView({ comment: updated, author })
  }

  async delete({ commentId, userId }: DeleteCommentParams): Promise<void> {
    const comment = await this.getOwnedActiveComment({ commentId, userId })

    await this.db.transaction(async (tx) => {
      const isDeleted = await this.commentsRepository.softDelete({ id: commentId, executor: tx })

      if (!isDeleted) return

      await this.revisionsRepository.deleteByComment({ commentId, executor: tx })

      await this.postsService.adjustCommentCount({
        postId: comment.postId,
        delta: -1,
        executor: tx,
      })

      if (comment.parentId) {
        await this.commentsRepository.incrementReplyCount({
          id: comment.parentId,
          delta: -1,
          executor: tx,
        })
      }
    })
  }

  async listRevisions(commentId: string): Promise<ContentRevisionList> {
    await this.getActiveComment(commentId)

    const revisions = await this.revisionsRepository.listByComment(commentId)
    return { revisions: revisions.map(toCommentRevision) }
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
  }: ResolveThreadRootParams): Promise<string | null> {
    if (!parentId) return null

    const parent = await this.getActiveComment(parentId)

    if (parent.postId !== postId) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return threadRootId(parent)
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
