import { Inject, Injectable } from "@nestjs/common"
import {
  runTransaction,
  type CommunityRuleValue,
  type Database,
  type DatabaseExecutor,
  type ReactionKindValue,
} from "@ponto/database"
import {
  ApiErrorCode,
  CommentSort,
  ContentRemoval,
  type CommentView,
  type CommentViewerState,
  type ContentRevisionList,
  type ContributionView,
  type Page,
  type ReactionKind,
} from "@ponto/types"
import { z } from "zod"

import { toSourceValues, type SourceInput } from "#src/common/content/sources.js"
import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  isActiveComment,
  threadRootId,
  toCommentRevision,
  toCommentView,
  toContributionView,
  type ActiveComment,
  type Comment,
} from "#src/modules/comments/domain/comment.js"
import { CommentRevisionsRepository } from "#src/modules/comments/repositories/comment-revisions.repository.js"
import { CommentsRepository } from "#src/modules/comments/repositories/comments.repository.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"
import { isWithinEditWindow } from "#src/modules/posts/domain/edit-window.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const idCursorSchema = z.object({ id: z.uuid() })
const offsetCursorSchema = z.object({ offset: z.string().regex(/^\d+$/) })

export const RELEVANT_COMMENTS_MAX_OFFSET = 1_000

export interface CreateCommentParams {
  postId: string
  authorId: string
  body: string
  sources: readonly SourceInput[]
  parentId: string | undefined
}

export interface ListPostCommentsParams {
  postId: string
  sort: CommentSort
  cursor: string | undefined
  limit: number
  viewerId: string | undefined
}

export interface ListCommentRepliesParams {
  commentId: string
  cursor: string | undefined
  limit: number
  viewerId: string | undefined
}

export interface ListContributionsParams {
  handle: string
  onlyHighlighted: boolean
  cursor: string | undefined
  limit: number
  viewerId: string | undefined
}

export interface UpdateCommentInput {
  body: string
  sources?: readonly SourceInput[]
  reason?: string | null
}

export interface UpdateCommentParams {
  commentId: string
  userId: string
  input: UpdateCommentInput
}

export interface DeleteCommentParams {
  commentId: string
  userId: string
}

export interface HighlightCommentParams {
  commentId: string
  userId: string
  note: string | null
}

export interface AdjustCommentReactionCountParams {
  commentId: string
  kind: ReactionKindValue
  delta: 1 | -1
  executor?: DatabaseExecutor
}

export interface RemoveCommentByModerationParams {
  commentId: string
  rule: CommunityRuleValue
  executor: DatabaseExecutor
}

export interface PurgeCommentsParams {
  authorId: string
  executor: DatabaseExecutor
}

export interface BuildCommentViewsParams {
  rows: readonly Comment[]
  viewerId: string | undefined
}

interface RemoveCommentParams {
  comment: Comment
  removedBy: ContentRemoval
  rule?: CommunityRuleValue
  executor: DatabaseExecutor
}

interface ResolveThreadRootParams {
  postId: string
  parentId: string | undefined
}

interface OwnedCommentParams {
  commentId: string
  userId: string
}

interface ToPageParams {
  rows: Comment[]
  limit: number
  viewerId: string | undefined
}

interface RequireCommentViewParams {
  comment: Comment
  viewerId: string | undefined
}

interface ViewerStatesParams {
  rows: readonly Comment[]
  viewerId: string
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

  async create({
    postId,
    authorId,
    body,
    sources,
    parentId,
  }: CreateCommentParams): Promise<CommentView> {
    const post = await this.postsService.getActivePost(postId)

    await this.postsService.assertCanReply({ post, userId: authorId })

    const root = await this.resolveThreadRoot({ postId, parentId })

    const comment = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const created = await this.commentsRepository.create({
          data: {
            postId,
            authorId,
            parentId: root?.id ?? null,
            body,
            sources: toSourceValues(sources),
          },
          executor: tx,
        })

        await this.postsService.adjustCommentCount({ postId, delta: 1, executor: tx })

        if (root)
          await this.commentsRepository.incrementReplyCount({ id: root.id, delta: 1, executor: tx })

        const recipientId = root ? root.authorId : post.authorId

        await this.notificationsService.notify({
          recipientId,
          actorId: authorId,
          type: root ? "comment_replied" : "post_commented",
          postId,
          commentId: created.id,
          executor: tx,
        })

        await this.postsService.notifyMentions({
          text: body,
          actorId: authorId,
          postId,
          commentId: created.id,
          skipUserIds: [recipientId],
          executor: tx,
        })

        return created
      },
    })

    return this.requireView({ comment, viewerId: authorId })
  }

  async listForPost({
    postId,
    sort,
    cursor,
    limit,
    viewerId,
  }: ListPostCommentsParams): Promise<Page<CommentView>> {
    await this.postsService.assertExists(postId)

    if (sort === CommentSort.RECENT) {
      const position = decodeCursor({ cursor, schema: idCursorSchema })

      const rows = await this.commentsRepository.listTopLevelByRecency({
        postId,
        beforeId: position?.id,
        limit: limit + 1,
      })

      return this.toPage({ rows, limit, viewerId })
    }

    const position = decodeCursor({ cursor, schema: offsetCursorSchema })
    const offset = Math.min(Number(position?.offset ?? 0), RELEVANT_COMMENTS_MAX_OFFSET)

    const rows = await this.commentsRepository.listTopLevelByRelevance({
      postId,
      offset,
      limit: limit + 1,
    })

    const views = await this.buildViews({ rows, viewerId })

    return buildPage({
      rows: views.map((view, index) => ({ view, offset: offset + index + 1 })),
      limit,
      toItem: ({ view }) => view,
      toCursor: (row) => ({ offset: String(row.offset) }),
    })
  }

  async listReplies({
    commentId,
    cursor,
    limit,
    viewerId,
  }: ListCommentRepliesParams): Promise<Page<CommentView>> {
    const parent = await this.commentsRepository.findById(commentId)

    if (!parent) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    const position = decodeCursor({ cursor, schema: idCursorSchema })

    const rows = await this.commentsRepository.listReplies({
      parentId: threadRootId(parent),
      afterId: position?.id,
      limit: limit + 1,
    })

    return this.toPage({ rows, limit, viewerId })
  }

  // A person's contributions across discussions (profile tabs), each with its post.
  async listContributions({
    handle,
    onlyHighlighted,
    cursor,
    limit,
    viewerId,
  }: ListContributionsParams): Promise<Page<ContributionView>> {
    const author = await this.usersService.getByHandle(handle)
    const position = decodeCursor({ cursor, schema: idCursorSchema })

    const rows = await this.commentsRepository.listByAuthor({
      authorId: author.id,
      beforeId: position?.id,
      limit: limit + 1,
      onlyHighlighted,
    })

    const contributions = await this.buildContributions({ rows, viewerId })

    return buildPage({
      rows: contributions,
      limit,
      toItem: (contribution) => contribution,
      toCursor: ({ comment }) => ({ id: comment.id }),
    })
  }

  async buildContributions({
    rows,
    viewerId,
  }: BuildCommentViewsParams): Promise<ContributionView[]> {
    const views = await this.buildViews({ rows, viewerId })
    const posts = await this.postsService.summaries(rows.map(({ postId }) => postId))

    return views.map((comment) => toContributionView({ comment, post: posts.get(comment.postId) }))
  }

  async buildViews({ rows, viewerId }: BuildCommentViewsParams): Promise<CommentView[]> {
    const authors = await this.usersService.findByIds(rows.map(({ authorId }) => authorId))
    const posts = await this.postsService.summaries([...new Set(rows.map(({ postId }) => postId))])

    const viewerStates = viewerId
      ? await this.viewerStates({ rows, viewerId })
      : new Map<string, CommentViewerState>()

    return rows.map((comment) =>
      toCommentView({
        comment,
        author: authors.get(comment.authorId),
        postAuthorId: posts.get(comment.postId)?.author?.id,
        viewer: viewerStates.get(comment.id) ?? null,
      }),
    )
  }

  async update({ commentId, userId, input }: UpdateCommentParams): Promise<CommentView> {
    const comment = await this.getOwnedActiveComment({ commentId, userId })

    if (!isWithinEditWindow({ createdAt: comment.createdAt, now: new Date() }))
      throw new AppError(ApiErrorCode.EDIT_WINDOW_EXPIRED)

    const updated = await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.revisionsRepository.create({
          data: {
            commentId,
            body: comment.body,
            sources: comment.sources,
            reason: input.reason ?? null,
          },
          executor: tx,
        })

        return this.commentsRepository.update({
          id: commentId,
          data: {
            body: input.body,
            sources: input.sources ? toSourceValues(input.sources) : comment.sources,
          },
          executor: tx,
        })
      },
    })

    if (!updated) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return this.requireView({ comment: updated, viewerId: userId })
  }

  // The post author marks contributions that brought something new; the commenter is told.
  async highlight({ commentId, userId, note }: HighlightCommentParams): Promise<CommentView> {
    const comment = await this.getActiveComment(commentId)
    const post = await this.postsService.getActivePost(comment.postId)

    if (post.authorId !== userId || comment.authorId === userId)
      throw new AppError(ApiErrorCode.FORBIDDEN)

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const isHighlighted = await this.commentsRepository.setHighlight({
          id: commentId,
          note,
          executor: tx,
        })

        if (!isHighlighted) return

        await this.postsService.adjustHighlightedCount({ postId: post.id, delta: 1, executor: tx })

        await this.notificationsService.notify({
          recipientId: comment.authorId,
          actorId: userId,
          type: "comment_highlighted",
          postId: post.id,
          commentId,
          executor: tx,
        })
      },
    })

    const highlighted = await this.getActiveComment(commentId)

    return this.requireView({ comment: highlighted, viewerId: userId })
  }

  async unhighlight({ commentId, userId }: OwnedCommentParams): Promise<void> {
    const comment = await this.getActiveComment(commentId)
    const post = await this.postsService.getActivePost(comment.postId)

    if (post.authorId !== userId) throw new AppError(ApiErrorCode.FORBIDDEN)

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const isCleared = await this.commentsRepository.clearHighlight({
          id: commentId,
          executor: tx,
        })

        if (isCleared) {
          await this.postsService.adjustHighlightedCount({
            postId: post.id,
            delta: -1,
            executor: tx,
          })
        }
      },
    })
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
    rule,
    executor,
  }: RemoveCommentByModerationParams): Promise<Comment> {
    const comment = await this.getActiveComment(commentId)

    await this.remove({ comment, removedBy: ContentRemoval.MODERATION, rule, executor })

    return comment
  }

  // Account deletion with "delete my contributions too": each goes as if its author removed it.
  async purgeAuthor({ authorId, executor }: PurgeCommentsParams): Promise<void> {
    const authored = await this.commentsRepository.listActiveByAuthor(authorId)

    for (const comment of authored)
      await this.remove({ comment, removedBy: ContentRemoval.AUTHOR, executor })
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

  private async requireView({ comment, viewerId }: RequireCommentViewParams): Promise<CommentView> {
    const [view] = await this.buildViews({ rows: [comment], viewerId })

    if (!view) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return view
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

  private async remove({ comment, removedBy, rule, executor }: RemoveCommentParams): Promise<void> {
    const removed = await this.commentsRepository.softDelete({
      id: comment.id,
      removedBy,
      rule,
      executor,
    })

    if (!removed) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    await this.revisionsRepository.deleteByComment({ commentId: comment.id, executor })

    await this.postsService.adjustCommentCount({ postId: comment.postId, delta: -1, executor })

    if (comment.highlightedAt) {
      await this.postsService.adjustHighlightedCount({
        postId: comment.postId,
        delta: -1,
        executor,
      })
    }

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
  }: OwnedCommentParams): Promise<ActiveComment> {
    const comment = await this.getActiveComment(commentId)

    if (comment.authorId !== userId) throw new AppError(ApiErrorCode.FORBIDDEN)

    return comment
  }

  private async viewerStates({
    rows,
    viewerId,
  }: ViewerStatesParams): Promise<Map<string, CommentViewerState>> {
    const reactionRows = await this.commentsRepository.listViewerReactions({
      viewerId,
      commentIds: rows.map(({ id }) => id),
    })

    const byComment = new Map<string, ReactionKind[]>()

    for (const { commentId, kind } of reactionRows)
      if (commentId) byComment.set(commentId, [...(byComment.get(commentId) ?? []), kind])

    return new Map(rows.map(({ id }) => [id, { reactions: byComment.get(id) ?? [] }]))
  }

  private async toPage({ rows, limit, viewerId }: ToPageParams): Promise<Page<CommentView>> {
    const views = await this.buildViews({ rows, viewerId })

    return buildPage({
      rows: views,
      limit,
      toItem: (view) => view,
      toCursor: (view) => ({ id: view.id }),
    })
  }
}
