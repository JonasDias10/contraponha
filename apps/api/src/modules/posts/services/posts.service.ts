import { Inject, Injectable } from "@nestjs/common"
import {
  runTransaction,
  type CommunityRuleValue,
  type Database,
  type DatabaseExecutor,
  type ReactionKindValue,
} from "@contraponha/database"
import {
  ApiErrorCode,
  ContentRemoval,
  ReplyPolicy,
  type ContentRevisionList,
  type ContextNoteView,
  type Page,
  type PostSummary,
  type PostView,
  type PostViewerState,
  type ReactionKind,
} from "@contraponha/types"
import { z } from "zod"

import {
  extractMentionHandles,
  toSourceValues,
  toSourceViews,
  type SourceInput,
} from "#src/common/content/sources.js"
import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { MediaService } from "#src/modules/media/services/media.service.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"
import { isWithinEditWindow } from "#src/modules/posts/domain/edit-window.js"
import {
  isActivePost,
  toContentRevision,
  toPostSummary,
  toPostView,
  type ActivePost,
  type Post,
} from "#src/modules/posts/domain/post.js"
import { PostContextRepository } from "#src/modules/posts/repositories/post-context.repository.js"
import { PostRevisionsRepository } from "#src/modules/posts/repositories/post-revisions.repository.js"
import { PostsRepository } from "#src/modules/posts/repositories/posts.repository.js"
import { TopicsService } from "#src/modules/topics/services/topics.service.js"
import { UserRelationsService } from "#src/modules/users/services/user-relations.service.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const postCursorSchema = z.object({ id: z.uuid() })

export interface CreatePostParams {
  authorId: string
  title: string | null
  body: string
  sources: readonly SourceInput[]
  topics: readonly string[]
  replyPolicy: ReplyPolicy
  mediaIds: readonly string[]
}

export interface PostViewParams {
  postId: string
  viewerId: string | undefined
}

export interface BuildViewsParams {
  rows: readonly Post[]
  viewerId: string | undefined
}

export interface ListPostsByHandleParams {
  handle: string
  cursor: string | undefined
  limit: number
  viewerId: string | undefined
}

export interface UpdatePostInput {
  title?: string | null
  body: string
  sources?: readonly SourceInput[]
  replyPolicy?: ReplyPolicy
  reason?: string | null
}

export interface UpdatePostParams {
  postId: string
  userId: string
  input: UpdatePostInput
}

export interface OwnPostParams {
  postId: string
  userId: string
}

export interface RemoveByModerationParams {
  postId: string
  rule: CommunityRuleValue
  executor: DatabaseExecutor
}

export interface RemovedPost {
  authorId: string
  storageKeysToDelete: string[]
}

export interface AssertCanReplyParams {
  post: Post
  userId: string
}

export interface AdjustCommentCountParams {
  postId: string
  delta: 1 | -1
  executor?: DatabaseExecutor
}

export interface AdjustHighlightedCountParams {
  postId: string
  delta: 1 | -1
  executor: DatabaseExecutor
}

export interface AdjustPostReactionCountParams {
  postId: string
  kind: ReactionKindValue
  delta: 1 | -1
  executor?: DatabaseExecutor
}

export interface NotifyMentionsParams {
  text: string
  actorId: string
  postId: string
  commentId?: string
  skipUserIds: readonly string[]
  executor: DatabaseExecutor
}

export interface PurgeAuthorParams {
  authorId: string
  executor: DatabaseExecutor
}

interface RemovePostParams {
  post: Post
  removedBy: ContentRemoval
  rule?: CommunityRuleValue
  executor: DatabaseExecutor
}

interface RequireViewParams {
  post: Post
  viewerId: string | undefined
}

interface ViewerStatesParams {
  rows: readonly Post[]
  viewerId: string
}

@Injectable()
export class PostsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly postsRepository: PostsRepository,
    private readonly revisionsRepository: PostRevisionsRepository,
    private readonly contextRepository: PostContextRepository,
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService,
    private readonly topicsService: TopicsService,
    private readonly notificationsService: NotificationsService,
    private readonly relations: UserRelationsService,
  ) {}

  async create(params: CreatePostParams): Promise<PostView> {
    const { authorId, mediaIds } = params

    await this.mediaService.verifyUploads({ ownerId: authorId, mediaIds })

    const post = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const created = await this.postsRepository.create({
          data: {
            authorId,
            title: params.title,
            body: params.body,
            sources: toSourceValues(params.sources),
            replyPolicy: params.replyPolicy,
          },
          executor: tx,
        })

        await this.mediaService.attachToPost({ mediaIds, postId: created.id, executor: tx })

        const topics = await this.topicsService.resolveForPost({
          names: params.topics,
          executor: tx,
        })

        await this.topicsService.attachToPost({ postId: created.id, topics, executor: tx })

        await this.usersService.adjustPostCount({ id: authorId, delta: 1, executor: tx })

        await this.notifyMentions({
          text: `${params.title ?? ""}\n${params.body}`,
          actorId: authorId,
          postId: created.id,
          skipUserIds: [],
          executor: tx,
        })

        return created
      },
    })

    return this.requireView({ post, viewerId: authorId })
  }

  async getView({ postId, viewerId }: PostViewParams): Promise<PostView> {
    const post = await this.postsRepository.findById(postId)

    if (!post) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return this.requireView({ post, viewerId })
  }

  // The pinned post opens the first page; later pages skip it.
  async listByHandle({
    handle,
    cursor,
    limit,
    viewerId,
  }: ListPostsByHandleParams): Promise<Page<PostView>> {
    const author = await this.usersService.getByHandle(handle)

    const isBlocked = await this.relations.isBlockedBetween({ viewerId, userId: author.id })

    if (isBlocked) return { items: [], nextCursor: null }

    const position = decodeCursor({ cursor, schema: postCursorSchema })
    const pinned = await this.postsRepository.findPinnedByAuthor(author.id)

    const rows = await this.postsRepository.listByAuthor({
      authorId: author.id,
      beforeId: position?.id,
      excludeId: pinned?.id,
      limit: limit + 1,
    })

    const ordered = !position && pinned ? [pinned, ...rows] : rows
    const views = await this.buildViews({ rows: ordered, viewerId })

    return buildPage({
      rows: views,
      limit: !position && pinned ? limit + 1 : limit,
      toItem: (view) => view,
      toCursor: (view) => ({ id: view.id }),
    })
  }

  // Builds views for any list of posts with a fixed number of batch queries (authors, media,
  // topics, revisions, context notes and the viewer's state), so feeds avoid per-post lookups.
  async buildViews({ rows, viewerId }: BuildViewsParams): Promise<PostView[]> {
    const postIds = rows.map(({ id }) => id)
    const authors = await this.usersService.findByIds(rows.map(({ authorId }) => authorId))
    const media = await this.mediaService.viewsForPosts(postIds)
    const topics = await this.topicsService.summariesForPosts(postIds)
    const revisionCounts = await this.revisionsRepository.countByPosts(postIds)
    const contextNotes = await this.contextNotesFor(postIds)

    const viewerStates = viewerId
      ? await this.viewerStates({ rows, viewerId })
      : new Map<string, PostViewerState>()

    return rows.map((post) =>
      toPostView({
        post,
        author: authors.get(post.authorId),
        media: media.get(post.id) ?? [],
        topics: topics.get(post.id) ?? [],
        contextNote: contextNotes.get(post.id) ?? null,
        revisionCount: revisionCounts.get(post.id) ?? 0,
        viewer: viewerStates.get(post.id) ?? null,
      }),
    )
  }

  findByIds(postIds: readonly string[]): Promise<Post[]> {
    return this.postsRepository.findByIds(postIds)
  }

  async summaries(postIds: readonly string[]): Promise<Map<string, PostSummary>> {
    const rows = await this.postsRepository.findByIds(postIds)
    const authors = await this.usersService.findByIds(rows.map(({ authorId }) => authorId))

    return new Map(
      rows.map((post) => [post.id, toPostSummary({ post, author: authors.get(post.authorId) })]),
    )
  }

  async update({ postId, userId, input }: UpdatePostParams): Promise<PostView> {
    const post = await this.getOwnedActivePost({ postId, userId })

    if (!isWithinEditWindow({ createdAt: post.createdAt, now: new Date() }))
      throw new AppError(ApiErrorCode.EDIT_WINDOW_EXPIRED)

    const updated = await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.revisionsRepository.create({
          data: {
            postId,
            title: post.title,
            body: post.body,
            sources: post.sources,
            reason: input.reason ?? null,
          },
          executor: tx,
        })

        return this.postsRepository.update({
          id: postId,
          data: {
            title: input.title === undefined ? post.title : input.title,
            body: input.body,
            sources: input.sources ? toSourceValues(input.sources) : post.sources,
            replyPolicy: input.replyPolicy ?? post.replyPolicy,
          },
          executor: tx,
        })
      },
    })

    if (!updated) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return this.requireView({ post: updated, viewerId: userId })
  }

  async pin({ postId, userId }: OwnPostParams): Promise<void> {
    await this.getOwnedActivePost({ postId, userId })

    await runTransaction({
      db: this.db,
      work: (tx) => this.postsRepository.pin({ id: postId, authorId: userId, executor: tx }),
    })
  }

  async unpin({ postId, userId }: OwnPostParams): Promise<void> {
    await this.getOwnedActivePost({ postId, userId })

    await runTransaction({
      db: this.db,
      work: (tx) => this.postsRepository.unpin({ id: postId, authorId: userId, executor: tx }),
    })
  }

  async delete({ postId, userId }: OwnPostParams): Promise<void> {
    const post = await this.getOwnedActivePost({ postId, userId })

    const removed = await runTransaction({
      db: this.db,
      work: (tx) => this.remove({ post, removedBy: ContentRemoval.AUTHOR, executor: tx }),
    })

    await this.mediaService.deleteStoredObjects(removed.storageKeysToDelete)
  }

  // Runs inside the moderator's transaction so the removal and its audit entry commit together;
  // the caller deletes the returned storage objects after committing.
  async removeByModeration({
    postId,
    rule,
    executor,
  }: RemoveByModerationParams): Promise<RemovedPost> {
    const post = await this.getActivePost(postId)

    return this.remove({ post, removedBy: ContentRemoval.MODERATION, rule, executor })
  }

  // Account deletion: every post goes as if its author had deleted it.
  async purgeAuthor({ authorId, executor }: PurgeAuthorParams): Promise<string[]> {
    const authored = await this.postsRepository.listActiveByAuthor(authorId)
    const storageKeys: string[] = []

    for (const post of authored) {
      const removed = await this.remove({ post, removedBy: ContentRemoval.AUTHOR, executor })

      storageKeys.push(...removed.storageKeysToDelete)
    }

    return storageKeys
  }

  async deleteStoredMedia(removed: RemovedPost): Promise<void> {
    await this.mediaService.deleteStoredObjects(removed.storageKeysToDelete)
  }

  async listRevisions(postId: string): Promise<ContentRevisionList> {
    await this.getActivePost(postId)

    const revisions = await this.revisionsRepository.listByPost(postId)
    return { revisions: revisions.map(toContentRevision) }
  }

  async assertExists(postId: string): Promise<void> {
    const post = await this.postsRepository.findById(postId)

    if (!post) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)
  }

  async isActive(postId: string): Promise<boolean> {
    const post = await this.postsRepository.findById(postId)
    return post !== undefined && isActivePost(post)
  }

  async getActivePost(postId: string): Promise<ActivePost> {
    const post = await this.postsRepository.findById(postId)

    if (!post || !isActivePost(post)) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return post
  }

  // With "following", only the author and the people the author follows contribute.
  async assertCanReply({ post, userId }: AssertCanReplyParams): Promise<void> {
    if (post.replyPolicy === ReplyPolicy.EVERYONE || post.authorId === userId) return

    const followers = await this.contextRepository.listAuthorsFollowingViewer({
      viewerId: userId,
      authorIds: [post.authorId],
    })

    if (!followers.has(post.authorId)) throw new AppError(ApiErrorCode.REPLIES_RESTRICTED)
  }

  adjustCommentCount({ postId, delta, executor }: AdjustCommentCountParams): Promise<void> {
    return this.postsRepository.incrementCommentCount({ id: postId, delta, executor })
  }

  adjustHighlightedCount({ postId, delta, executor }: AdjustHighlightedCountParams): Promise<void> {
    return this.postsRepository.incrementHighlightedCount({ id: postId, delta, executor })
  }

  adjustReactionCount({
    postId,
    kind,
    delta,
    executor,
  }: AdjustPostReactionCountParams): Promise<void> {
    return this.postsRepository.incrementReactionCount({ id: postId, kind, delta, executor })
  }

  async notifyMentions({
    text,
    actorId,
    postId,
    commentId,
    skipUserIds,
    executor,
  }: NotifyMentionsParams): Promise<void> {
    const mentioned = await this.usersService.findByHandles({
      handles: extractMentionHandles(text),
      executor,
    })

    for (const user of mentioned) {
      if (skipUserIds.includes(user.id)) continue

      await this.notificationsService.notify({
        recipientId: user.id,
        actorId,
        type: "mentioned",
        postId,
        commentId,
        executor,
      })
    }
  }

  private async requireView({ post, viewerId }: RequireViewParams): Promise<PostView> {
    const [view] = await this.buildViews({ rows: [post], viewerId })

    if (!view) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return view
  }

  private async contextNotesFor(postIds: readonly string[]): Promise<Map<string, ContextNoteView>> {
    const notes = await this.contextRepository.listActiveContextNotes(postIds)

    return new Map(
      notes.map((note) => [
        note.postId,
        {
          id: note.id,
          body: note.body,
          sources: toSourceViews(note.sources),
          createdAt: note.createdAt.toISOString(),
        },
      ]),
    )
  }

  private async viewerStates({
    rows,
    viewerId,
  }: ViewerStatesParams): Promise<Map<string, PostViewerState>> {
    const postIds = rows.map(({ id }) => id)
    const reactionRows = await this.contextRepository.listViewerReactions({ viewerId, postIds })
    const bookmarked = await this.contextRepository.listViewerBookmarks({ viewerId, postIds })

    const authorsFollowingViewer = await this.contextRepository.listAuthorsFollowingViewer({
      viewerId,
      authorIds: rows.map(({ authorId }) => authorId),
    })

    const reactionsByPost = new Map<string, ReactionKind[]>()

    for (const { postId, kind } of reactionRows)
      if (postId) reactionsByPost.set(postId, [...(reactionsByPost.get(postId) ?? []), kind])

    return new Map(
      rows.map((post) => [
        post.id,
        {
          reactions: reactionsByPost.get(post.id) ?? [],
          isBookmarked: bookmarked.has(post.id),
          canReply:
            isActivePost(post) &&
            (post.replyPolicy === ReplyPolicy.EVERYONE ||
              post.authorId === viewerId ||
              authorsFollowingViewer.has(post.authorId)),
        },
      ]),
    )
  }

  private async remove({
    post,
    removedBy,
    rule,
    executor,
  }: RemovePostParams): Promise<RemovedPost> {
    const isRemoved = await this.postsRepository.softDelete({
      id: post.id,
      removedBy,
      rule,
      executor,
    })

    if (!isRemoved) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    await this.revisionsRepository.deleteByPost({ postId: post.id, executor })

    await this.topicsService.releaseFromPost({ postId: post.id, executor })

    await this.usersService.adjustPostCount({ id: post.authorId, delta: -1, executor })

    const storageKeysToDelete = await this.mediaService.detachFromPost({
      postId: post.id,
      executor,
    })

    return { authorId: post.authorId, storageKeysToDelete }
  }

  private async getOwnedActivePost({ postId, userId }: OwnPostParams): Promise<ActivePost> {
    const post = await this.getActivePost(postId)

    if (post.authorId !== userId) throw new AppError(ApiErrorCode.FORBIDDEN)

    return post
  }
}
