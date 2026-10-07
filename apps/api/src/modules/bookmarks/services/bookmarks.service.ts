import { Injectable } from "@nestjs/common"
import type { DatabaseExecutor } from "@ponto/database"
import type { BookmarkCount, Page, PostView } from "@ponto/types"
import { z } from "zod"

import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { BookmarksRepository } from "#src/modules/bookmarks/repositories/bookmarks.repository.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"

const bookmarkCursorSchema = z.object({ createdAt: z.iso.datetime(), postId: z.uuid() })

export interface BookmarkPostParams {
  userId: string
  postId: string
}

export interface ListBookmarksParams {
  userId: string
  cursor: string | undefined
  limit: number
}

export interface PurgeBookmarksParams {
  userId: string
  executor: DatabaseExecutor
}

@Injectable()
export class BookmarksService {
  constructor(
    private readonly bookmarksRepository: BookmarksRepository,
    private readonly postsService: PostsService,
  ) {}

  async add({ userId, postId }: BookmarkPostParams): Promise<void> {
    await this.postsService.getActivePost(postId)

    await this.bookmarksRepository.add({ userId, postId })
  }

  remove({ userId, postId }: BookmarkPostParams): Promise<void> {
    return this.bookmarksRepository.remove({ userId, postId })
  }

  async list({ userId, cursor, limit }: ListBookmarksParams): Promise<Page<PostView>> {
    const position = decodeCursor({ cursor, schema: bookmarkCursorSchema })

    const rows = await this.bookmarksRepository.listPosts({
      userId,
      before: position
        ? { createdAt: new Date(position.createdAt), postId: position.postId }
        : undefined,
      limit: limit + 1,
    })

    const views = await this.postsService.buildViews({
      rows: rows.map(({ post }) => post),
      viewerId: userId,
    })

    return buildPage({
      rows: views.map((view, index) => ({ view, bookmarkedAt: rows[index]?.bookmarkedAt })),
      limit,
      toItem: ({ view }) => view,
      toCursor: ({ view, bookmarkedAt }) => ({
        createdAt: (bookmarkedAt ?? new Date(0)).toISOString(),
        postId: view.id,
      }),
    })
  }

  async count(userId: string): Promise<BookmarkCount> {
    const total = await this.bookmarksRepository.count(userId)
    return { count: total }
  }

  purgeUser({ userId, executor }: PurgeBookmarksParams): Promise<void> {
    return this.bookmarksRepository.deleteAllByUser({ userId, executor })
  }
}
