import { Inject, Injectable } from "@nestjs/common"
import {
  postRevisions,
  type Database,
  type DatabaseExecutor,
  type ContentSourceValue,
  type PostRevisionRow,
} from "@contraponha/database"
import { count, desc, eq, inArray } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface PostRevisionData {
  postId: string
  title: string | null
  body: string
  sources: ContentSourceValue[]
  reason: string | null
}

export interface CreatePostRevisionParams {
  data: PostRevisionData
  executor?: DatabaseExecutor
}

export interface DeletePostRevisionsParams {
  postId: string
  executor?: DatabaseExecutor
}

@Injectable()
export class PostRevisionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create({ data, executor = this.db }: CreatePostRevisionParams): Promise<void> {
    await executor.insert(postRevisions).values(data)
  }

  async countByPosts(postIds: readonly string[]): Promise<Map<string, number>> {
    if (postIds.length === 0) return new Map()

    const rows = await this.db
      .select({ postId: postRevisions.postId, total: count() })
      .from(postRevisions)
      .where(inArray(postRevisions.postId, [...postIds]))
      .groupBy(postRevisions.postId)

    return new Map(rows.map(({ postId, total }) => [postId, total]))
  }

  listByPost(postId: string): Promise<PostRevisionRow[]> {
    return this.db
      .select()
      .from(postRevisions)
      .where(eq(postRevisions.postId, postId))
      .orderBy(desc(postRevisions.id))
  }

  async deleteByPost({ postId, executor = this.db }: DeletePostRevisionsParams): Promise<void> {
    await executor.delete(postRevisions).where(eq(postRevisions.postId, postId))
  }
}
