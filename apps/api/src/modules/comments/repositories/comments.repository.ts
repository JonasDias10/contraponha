import { Inject, Injectable } from "@nestjs/common"
import {
  comments,
  REACTION_COUNT_FIELDS,
  type Database,
  type DatabaseExecutor,
  type ReactionKindValue,
} from "@ponto/database"
import type { ContentRemoval } from "@ponto/types"
import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Comment } from "#src/modules/comments/domain/comment.js"

export interface CreateCommentData {
  postId: string
  authorId: string
  parentId: string | null
  body: string
}

export interface CreateCommentParams {
  data: CreateCommentData
  executor?: DatabaseExecutor
}

export interface ListTopLevelCommentsParams {
  postId: string
  afterId: string | undefined
  limit: number
}

export interface ListRepliesParams {
  parentId: string
  afterId: string | undefined
  limit: number
}

export interface UpdateCommentBodyParams {
  id: string
  body: string
  executor?: DatabaseExecutor
}

export interface SoftDeleteCommentParams {
  id: string
  removedBy: ContentRemoval
  executor?: DatabaseExecutor
}

export interface IncrementReplyCountParams {
  id: string
  delta: 1 | -1
  executor?: DatabaseExecutor
}

export interface IncrementCommentReactionCountParams {
  id: string
  kind: ReactionKindValue
  delta: 1 | -1
  executor?: DatabaseExecutor
}

@Injectable()
export class CommentsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create({ data, executor = this.db }: CreateCommentParams): Promise<Comment> {
    const [comment] = await executor.insert(comments).values(data).returning()

    if (!comment) throw new Error("Insert into comments returned no row")

    return comment
  }

  async findById(id: string): Promise<Comment | undefined> {
    const [comment] = await this.db.select().from(comments).where(eq(comments.id, id))
    return comment
  }

  // Removed comments stay listed only while they still anchor replies.
  listTopLevel({ postId, afterId, limit }: ListTopLevelCommentsParams): Promise<Comment[]> {
    return this.db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.postId, postId),
          isNull(comments.parentId),
          or(isNull(comments.deletedAt), gt(comments.replyCount, 0)),
          afterId ? gt(comments.id, afterId) : undefined,
        ),
      )
      .orderBy(asc(comments.id))
      .limit(limit)
  }

  listReplies({ parentId, afterId, limit }: ListRepliesParams): Promise<Comment[]> {
    return this.db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.parentId, parentId),
          isNull(comments.deletedAt),
          afterId ? gt(comments.id, afterId) : undefined,
        ),
      )
      .orderBy(asc(comments.id))
      .limit(limit)
  }

  async updateBody({
    id,
    body,
    executor = this.db,
  }: UpdateCommentBodyParams): Promise<Comment | undefined> {
    const [comment] = await executor
      .update(comments)
      .set({ body, editedAt: new Date() })
      .where(and(eq(comments.id, id), isNull(comments.deletedAt)))
      .returning()

    return comment
  }

  async softDelete({
    id,
    removedBy,
    executor = this.db,
  }: SoftDeleteCommentParams): Promise<boolean> {
    const deleted = await executor
      .update(comments)
      .set({ body: null, deletedAt: new Date(), removedBy })
      .where(and(eq(comments.id, id), isNull(comments.deletedAt)))
      .returning({ id: comments.id })

    return deleted.length > 0
  }

  async incrementReplyCount({
    id,
    delta,
    executor = this.db,
  }: IncrementReplyCountParams): Promise<void> {
    await executor
      .update(comments)
      .set({ replyCount: sql`${comments.replyCount} + ${delta}` })
      .where(eq(comments.id, id))
  }

  async incrementReactionCount({
    id,
    kind,
    delta,
    executor = this.db,
  }: IncrementCommentReactionCountParams): Promise<void> {
    const field = REACTION_COUNT_FIELDS[kind]

    await executor
      .update(comments)
      .set({ [field]: sql`${comments[field]} + ${delta}` })
      .where(eq(comments.id, id))
  }
}
