import { Inject, Injectable } from "@nestjs/common"
import {
  postRevisions,
  type Database,
  type DatabaseExecutor,
  type PostRevisionRow,
} from "@ponto/database"
import { desc, eq } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface CreatePostRevisionParams {
  postId: string
  body: string
  executor?: DatabaseExecutor
}

export interface DeletePostRevisionsParams {
  postId: string
  executor?: DatabaseExecutor
}

@Injectable()
export class PostRevisionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create({ postId, body, executor = this.db }: CreatePostRevisionParams): Promise<void> {
    await executor.insert(postRevisions).values({ postId, body })
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
