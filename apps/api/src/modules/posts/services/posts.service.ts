import { Inject, Injectable } from "@nestjs/common"
import {
  runTransaction,
  type Database,
  type DatabaseExecutor,
  type ReactionKindValue,
} from "@ponto/database"
import { ApiErrorCode, type ContentRevisionList, type Page, type PostView } from "@ponto/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { isWithinEditWindow } from "#src/modules/posts/domain/edit-window.js"
import {
  isActivePost,
  toContentRevision,
  toPostView,
  type ActivePost,
} from "#src/modules/posts/domain/post.js"
import { PostRevisionsRepository } from "#src/modules/posts/repositories/post-revisions.repository.js"
import { PostsRepository } from "#src/modules/posts/repositories/posts.repository.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const postCursorSchema = z.object({ id: z.uuid() })

export interface CreatePostParams {
  authorId: string
  body: string
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
  ) {}

  async create({ authorId, body }: CreatePostParams): Promise<PostView> {
    const post = await this.postsRepository.create({ authorId, body })
    const author = await this.usersService.getById(authorId)
    return toPostView({ post, author })
  }

  async getView(postId: string): Promise<PostView> {
    const post = await this.postsRepository.findById(postId)

    if (!post) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    const authors = await this.usersService.findByIds([post.authorId])
    return toPostView({ post, author: authors.get(post.authorId) })
  }

  async listByHandle({ handle, cursor, limit }: ListPostsByHandleParams): Promise<Page<PostView>> {
    const author = await this.usersService.getByHandle(handle)
    const position = decodeCursor({ cursor, schema: postCursorSchema })

    const rows = await this.postsRepository.listByAuthor({
      authorId: author.id,
      beforeId: position?.id,
      limit: limit + 1,
    })

    return buildPage({
      rows,
      limit,
      toItem: (post) => toPostView({ post, author }),
      toCursor: (post) => ({ id: post.id }),
    })
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

    const author = await this.usersService.getById(userId)
    return toPostView({ post: updated, author })
  }

  async delete({ postId, userId }: DeletePostParams): Promise<void> {
    await this.getOwnedActivePost({ postId, userId })

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.postsRepository.softDelete({ id: postId, executor: tx })

        await this.revisionsRepository.deleteByPost({ postId, executor: tx })
      },
    })
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

  private async getOwnedActivePost({
    postId,
    userId,
  }: GetOwnedActivePostParams): Promise<ActivePost> {
    const post = await this.getActivePost(postId)

    if (post.authorId !== userId) throw new AppError(ApiErrorCode.FORBIDDEN)

    return post
  }
}
