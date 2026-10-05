import { Inject, Injectable } from "@nestjs/common"
import {
  posts,
  REACTION_COUNT_FIELDS,
  type Database,
  type DatabaseExecutor,
  type ReactionKindValue,
} from "@ponto/database"
import { and, desc, eq, isNull, lt, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Post } from "#src/modules/posts/domain/post.js"

export interface CreatePostData {
  authorId: string
  body: string
}

export interface ListPostsByAuthorParams {
  authorId: string
  beforeId: string | undefined
  limit: number
}

export interface UpdatePostBodyParams {
  id: string
  body: string
  executor?: DatabaseExecutor
}

export interface SoftDeletePostParams {
  id: string
  executor?: DatabaseExecutor
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

  async create(data: CreatePostData): Promise<Post> {
    const [post] = await this.db.insert(posts).values(data).returning()

    if (!post) throw new Error("Insert into posts returned no row")

    return post
  }

  async findById(id: string): Promise<Post | undefined> {
    const [post] = await this.db.select().from(posts).where(eq(posts.id, id))
    return post
  }

  listByAuthor({ authorId, beforeId, limit }: ListPostsByAuthorParams): Promise<Post[]> {
    return this.db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.authorId, authorId),
          isNull(posts.deletedAt),
          beforeId ? lt(posts.id, beforeId) : undefined,
        ),
      )
      .orderBy(desc(posts.id))
      .limit(limit)
  }

  async updateBody({
    id,
    body,
    executor = this.db,
  }: UpdatePostBodyParams): Promise<Post | undefined> {
    const [post] = await executor
      .update(posts)
      .set({ body, editedAt: new Date() })
      .where(and(eq(posts.id, id), isNull(posts.deletedAt)))
      .returning()

    return post
  }

  async softDelete({ id, executor = this.db }: SoftDeletePostParams): Promise<boolean> {
    const deleted = await executor
      .update(posts)
      .set({ body: null, deletedAt: new Date() })
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
