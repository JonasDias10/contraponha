import { Inject, Injectable } from "@nestjs/common"
import {
  commentRevisions,
  type CommentRevisionRow,
  type Database,
  type DatabaseExecutor,
} from "@ponto/database"
import { desc, eq } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface CreateCommentRevisionParams {
  commentId: string
  body: string
  executor?: DatabaseExecutor
}

export interface DeleteCommentRevisionsParams {
  commentId: string
  executor?: DatabaseExecutor
}

@Injectable()
export class CommentRevisionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create({
    commentId,
    body,
    executor = this.db,
  }: CreateCommentRevisionParams): Promise<void> {
    await executor.insert(commentRevisions).values({ commentId, body })
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
