import { Inject, Injectable } from "@nestjs/common"
import { bookmarks, posts, type Database, type DatabaseExecutor } from "@ponto/database"
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Post } from "#src/modules/posts/domain/post.js"

export interface BookmarkParams {
  userId: string
  postId: string
}

export interface BookmarkPosition {
  createdAt: Date
  postId: string
}

export interface ListBookmarkedPostsParams {
  userId: string
  before: BookmarkPosition | undefined
  limit: number
}

export interface BookmarkedPostRow {
  post: Post
  bookmarkedAt: Date
}

export interface DeleteBookmarksParams {
  userId: string
  executor: DatabaseExecutor
}

@Injectable()
export class BookmarksRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async add({ userId, postId }: BookmarkParams): Promise<void> {
    await this.db.insert(bookmarks).values({ userId, postId }).onConflictDoNothing()
  }

  async remove({ userId, postId }: BookmarkParams): Promise<void> {
    await this.db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.postId, postId)))
  }

  // Joins posts to skip removed ones; saved posts that disappear simply leave the list.
  listPosts({ userId, before, limit }: ListBookmarkedPostsParams): Promise<BookmarkedPostRow[]> {
    return this.db
      .select({ post: posts, bookmarkedAt: bookmarks.createdAt })
      .from(bookmarks)
      .innerJoin(posts, eq(posts.id, bookmarks.postId))
      .where(
        and(
          eq(bookmarks.userId, userId),
          isNull(posts.deletedAt),
          before
            ? or(
                lt(bookmarks.createdAt, before.createdAt),
                and(eq(bookmarks.createdAt, before.createdAt), lt(bookmarks.postId, before.postId)),
              )
            : undefined,
        ),
      )
      .orderBy(desc(bookmarks.createdAt), desc(bookmarks.postId))
      .limit(limit)
  }

  async count(userId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(bookmarks)
      .innerJoin(posts, eq(posts.id, bookmarks.postId))
      .where(and(eq(bookmarks.userId, userId), isNull(posts.deletedAt)))

    return row?.total ?? 0
  }

  async deleteAllByUser({ userId, executor }: DeleteBookmarksParams): Promise<void> {
    await executor.delete(bookmarks).where(eq(bookmarks.userId, userId))
  }
}
