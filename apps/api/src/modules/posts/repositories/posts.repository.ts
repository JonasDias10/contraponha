import { Inject, Injectable } from "@nestjs/common"
import {
  posts,
  REACTION_COUNT_FIELDS,
  type Database,
  type DatabaseExecutor,
  type CommunityRuleValue,
  type ContentSourceValue,
  type ReactionKindValue,
} from "@contraponha/database"
import type { ContentRemoval, ReplyPolicy } from "@contraponha/types"
import { and, desc, eq, inArray, isNotNull, isNull, lt, ne, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Post } from "#src/modules/posts/domain/post.js"

export interface CreatePostData {
  authorId: string
  title: string | null
  body: string
  sources: ContentSourceValue[]
  replyPolicy: ReplyPolicy
}

export interface UpdatePostData {
  title: string | null
  body: string
  sources: ContentSourceValue[]
  replyPolicy: ReplyPolicy
}

export interface PinPostParams {
  id: string
  authorId: string
  executor: DatabaseExecutor
}

export interface CreatePostParams {
  data: CreatePostData
  executor?: DatabaseExecutor
}

export interface ListPostsByAuthorParams {
  authorId: string
  beforeId: string | undefined
  excludeId: string | undefined
  limit: number
}

export interface UpdatePostParams {
  id: string
  data: UpdatePostData
  executor?: DatabaseExecutor
}

export interface SoftDeletePostParams {
  id: string
  removedBy: ContentRemoval
  rule?: CommunityRuleValue
  executor?: DatabaseExecutor
}

export interface IncrementHighlightedCountParams {
  id: string
  delta: 1 | -1
  executor: DatabaseExecutor
}

export interface IncrementCommentCountParams {
  id: string
  delta: 1 | -1
  executor?: DatabaseExecutor
}

export interface IncrementPostReactionCountParams {
  id: string
  kind: ReactionKindValue
  delta: 1 | -1
  executor?: DatabaseExecutor
}

@Injectable()
export class PostsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create({ data, executor = this.db }: CreatePostParams): Promise<Post> {
    const [post] = await executor.insert(posts).values(data).returning()

    if (!post) throw new Error("Insert into posts returned no row")

    return post
  }

  async findById(id: string): Promise<Post | undefined> {
    const [post] = await this.db.select().from(posts).where(eq(posts.id, id))
    return post
  }

  async findPinnedByAuthor(authorId: string): Promise<Post | undefined> {
    const [post] = await this.db
      .select()
      .from(posts)
      .where(and(eq(posts.authorId, authorId), isNotNull(posts.pinnedAt), isNull(posts.deletedAt)))

    return post
  }

  findByIds(ids: readonly string[]): Promise<Post[]> {
    if (ids.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(posts)
      .where(inArray(posts.id, [...ids]))
  }

  listByAuthor({ authorId, beforeId, excludeId, limit }: ListPostsByAuthorParams): Promise<Post[]> {
    return this.db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.authorId, authorId),
          isNull(posts.deletedAt),
          beforeId ? lt(posts.id, beforeId) : undefined,
          excludeId ? ne(posts.id, excludeId) : undefined,
        ),
      )
      .orderBy(desc(posts.id))
      .limit(limit)
  }

  async update({ id, data, executor = this.db }: UpdatePostParams): Promise<Post | undefined> {
    const [post] = await executor
      .update(posts)
      .set({ ...data, editedAt: new Date() })
      .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
      .returning()

    return post
  }

  // Only one post per author is pinned: the previous one is unpinned in the same statement order.
  async pin({ id, authorId, executor }: PinPostParams): Promise<boolean> {
    await executor
      .update(posts)
      .set({ pinnedAt: null })
      .where(and(eq(posts.authorId, authorId), isNotNull(posts.pinnedAt), ne(posts.id, id)))

    const pinned = await executor
      .update(posts)
      .set({ pinnedAt: new Date() })
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId), isNull(posts.deletedAt)))
      .returning({ id: posts.id })

    return pinned.length > 0
  }

  async unpin({ id, authorId, executor }: PinPostParams): Promise<void> {
    await executor
      .update(posts)
      .set({ pinnedAt: null })
      .where(and(eq(posts.id, id), eq(posts.authorId, authorId)))
  }

  async softDelete({
    id,
    removedBy,
    rule,
    executor = this.db,
  }: SoftDeletePostParams): Promise<boolean> {
    const deleted = await executor
      .update(posts)
      .set({
        title: null,
        body: null,
        sources: [],
        pinnedAt: null,
        deletedAt: new Date(),
        removedBy,
        removalRule: rule ?? null,
      })
      .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
      .returning({ id: posts.id })

    return deleted.length > 0
  }

  async incrementCommentCount({
    id,
    delta,
    executor = this.db,
  }: IncrementCommentCountParams): Promise<void> {
    await executor
      .update(posts)
      .set({ commentCount: sql`${posts.commentCount} + ${delta}` })
      .where(eq(posts.id, id))
  }

  async incrementHighlightedCount({
    id,
    delta,
    executor,
  }: IncrementHighlightedCountParams): Promise<void> {
    await executor
      .update(posts)
      .set({ highlightedCommentCount: sql`${posts.highlightedCommentCount} + ${delta}` })
      .where(eq(posts.id, id))
  }

  listActiveByAuthor(authorId: string): Promise<Post[]> {
    return this.db
      .select()
      .from(posts)
      .where(and(eq(posts.authorId, authorId), isNull(posts.deletedAt)))
  }

  async incrementReactionCount({
    id,
    kind,
    delta,
    executor = this.db,
  }: IncrementPostReactionCountParams): Promise<void> {
    const field = REACTION_COUNT_FIELDS[kind]

    await executor
      .update(posts)
      .set({ [field]: sql`${posts[field]} + ${delta}` })
      .where(eq(posts.id, id))
  }
}
