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
  type ContentRevisionList,
  type Page,
  type PostView,
} from "@ponto/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { MediaService } from "#src/modules/media/services/media.service.js"
import { isWithinEditWindow } from "#src/modules/posts/domain/edit-window.js"
import {
  isActivePost,
  toContentRevision,
  toPostView,
  type ActivePost,
  type Post,
} from "#src/modules/posts/domain/post.js"
import { PostRevisionsRepository } from "#src/modules/posts/repositories/post-revisions.repository.js"
import { PostsRepository } from "#src/modules/posts/repositories/posts.repository.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const postCursorSchema = z.object({ id: z.uuid() })

export interface CreatePostParams {
  authorId: string
  body: string
  mediaIds: readonly string[]
}

export interface ListPostsByHandleParams {
  handle: string
  cursor: string | undefined
  limit: number
}

export interface UpdatePostParams {
  postId: string
  userId: string
  body: string
}

export interface DeletePostParams {
  postId: string
  userId: string
}

export interface RemoveByModerationParams {
  postId: string
  executor: DatabaseExecutor
}

export interface RemovedPost {
  storageKeysToDelete: string[]
}

export interface AdjustCommentCountParams {
  postId: string
  delta: 1 | -1
  executor?: DatabaseExecutor
}

export interface AdjustPostReactionCountParams {
  postId: string
  kind: ReactionKindValue
  delta: 1 | -1
  executor?: DatabaseExecutor
}

interface RemovePostParams {
  postId: string
  removedBy: ContentRemoval
  executor: DatabaseExecutor
}

interface GetOwnedActivePostParams {
  postId: string
  userId: string
}

@Injectable()
export class PostsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly postsRepository: PostsRepository,
    private readonly revisionsRepository: PostRevisionsRepository,
    private readonly usersService: UsersService,
    private readonly mediaService: MediaService,
  ) {}

  async create({ authorId, body, mediaIds }: CreatePostParams): Promise<PostView> {
    await this.mediaService.verifyUploads({ ownerId: authorId, mediaIds })

    const post = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const created = await this.postsRepository.create({
          data: { authorId, body },
          executor: tx,
        })

        await this.mediaService.attachToPost({ mediaIds, postId: created.id, executor: tx })

        return created
      },
    })

    const [view] = await this.buildViews([post])

    if (!view) throw new Error("Could not build the view of a post that was just created")

    return view
  }

  async getView(postId: string): Promise<PostView> {
    const post = await this.postsRepository.findById(postId)

    if (!post) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    const [view] = await this.buildViews([post])

    if (!view) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return view
  }

  async listByHandle({ handle, cursor, limit }: ListPostsByHandleParams): Promise<Page<PostView>> {
    const author = await this.usersService.getByHandle(handle)
    const position = decodeCursor({ cursor, schema: postCursorSchema })

    const rows = await this.postsRepository.listByAuthor({
      authorId: author.id,
      beforeId: position?.id,
      limit: limit + 1,
    })

    const views = await this.buildViews(rows)

    return buildPage({
      rows: views,
      limit,
      toItem: (view) => view,
      toCursor: (view) => ({ id: view.id }),
    })
  }

  // Builds views for any list of posts with one query for authors and one for media,
  // so feeds and search results avoid per-post lookups.
  async buildViews(rows: readonly Post[]): Promise<PostView[]> {
    const authors = await this.usersService.findByIds(rows.map(({ authorId }) => authorId))
    const media = await this.mediaService.viewsForPosts(rows.map(({ id }) => id))

    return rows.map((post) =>
      toPostView({ post, author: authors.get(post.authorId), media: media.get(post.id) ?? [] }),
    )
  }

  async update({ postId, userId, body }: UpdatePostParams): Promise<PostView> {
    const post = await this.getOwnedActivePost({ postId, userId })

    if (!isWithinEditWindow({ createdAt: post.createdAt, now: new Date() }))
      throw new AppError(ApiErrorCode.EDIT_WINDOW_EXPIRED)

    const updated = await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.revisionsRepository.create({ postId, body: post.body, executor: tx })

        return this.postsRepository.updateBody({ id: postId, body, executor: tx })
      },
    })

    if (!updated) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    const [view] = await this.buildViews([updated])

    if (!view) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    return view
  }

  async delete({ postId, userId }: DeletePostParams): Promise<void> {
    await this.getOwnedActivePost({ postId, userId })

    const removed = await runTransaction({
      db: this.db,
      work: (tx) => this.remove({ postId, removedBy: ContentRemoval.AUTHOR, executor: tx }),
    })

    await this.mediaService.deleteStoredObjects(removed.storageKeysToDelete)
  }

  // Runs inside the moderator's transaction so the removal and its audit entry commit together;
  // the caller deletes the returned storage objects after committing.
  async removeByModeration({ postId, executor }: RemoveByModerationParams): Promise<RemovedPost> {
    await this.getActivePost(postId)

    return this.remove({ postId, removedBy: ContentRemoval.MODERATION, executor })
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

  adjustCommentCount({ postId, delta, executor }: AdjustCommentCountParams): Promise<void> {
    return this.postsRepository.incrementCommentCount({ id: postId, delta, executor })
  }

  adjustReactionCount({
    postId,
    kind,
    delta,
    executor,
  }: AdjustPostReactionCountParams): Promise<void> {
    return this.postsRepository.incrementReactionCount({ id: postId, kind, delta, executor })
  }

  private async remove({ postId, removedBy, executor }: RemovePostParams): Promise<RemovedPost> {
    const isRemoved = await this.postsRepository.softDelete({ id: postId, removedBy, executor })

    if (!isRemoved) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    await this.revisionsRepository.deleteByPost({ postId, executor })

    const storageKeysToDelete = await this.mediaService.detachFromPost({ postId, executor })
    return { storageKeysToDelete }
  }

  private async getOwnedActivePost({
    postId,
    userId,
  }: GetOwnedActivePostParams): Promise<ActivePost> {
    const post = await this.getActivePost(postId)

    if (post.authorId !== userId) throw new AppError(ApiErrorCode.FORBIDDEN)

    return post
  }
}
