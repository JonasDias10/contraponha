import { Inject, Injectable } from "@nestjs/common"
import {
  commentRevisions,
  type CommentRevisionRow,
  type ContentSourceValue,
  type Database,
  type DatabaseExecutor,
} from "@ponto/database"
import { desc, eq } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface CommentRevisionData {
  commentId: string
  body: string
  sources: ContentSourceValue[]
  reason: string | null
}

export interface CreateCommentRevisionParams {
  data: CommentRevisionData
  executor?: DatabaseExecutor
}

export interface DeleteCommentRevisionsParams {
  commentId: string
  executor?: DatabaseExecutor
}

@Injectable()
export class CommentRevisionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create({ data, executor = this.db }: CreateCommentRevisionParams): Promise<void> {
    await executor.insert(commentRevisions).values(data)
  }

  listByComment(commentId: string): Promise<CommentRevisionRow[]> {
    return this.db
      .select()
      .from(commentRevisions)
      .where(eq(commentRevisions.commentId, commentId))
      .orderBy(desc(commentRevisions.id))
  }

  async deleteByComment({
    commentId,
    executor = this.db,
  }: DeleteCommentRevisionsParams): Promise<void> {
    await executor.delete(commentRevisions).where(eq(commentRevisions.commentId, commentId))
  }
}
