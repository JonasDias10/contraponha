import { Inject, Injectable } from "@nestjs/common"
import {
  comments,
  reactions,
  REACTION_COUNT_FIELDS,
  type CommunityRuleValue,
  type ContentSourceValue,
  type Database,
  type DatabaseExecutor,
  type ReactionKindValue,
} from "@ponto/database"
import type { ContentRemoval } from "@ponto/types"
import { and, asc, desc, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { RELEVANCE_WEIGHTS, type Comment } from "#src/modules/comments/domain/comment.js"

export interface CreateCommentData {
  postId: string
  authorId: string
  parentId: string | null
  body: string
  sources: ContentSourceValue[]
}

export interface CreateCommentParams {
  data: CreateCommentData
  executor?: DatabaseExecutor
}

export interface ListTopLevelByRecencyParams {
  postId: string
  beforeId: string | undefined
  limit: number
}

export interface ListTopLevelByRelevanceParams {
  postId: string
  offset: number
  limit: number
}

export interface ListRepliesParams {
  parentId: string
  afterId: string | undefined
  limit: number
}

export interface ListByAuthorParams {
  authorId: string
  beforeId: string | undefined
  limit: number
  onlyHighlighted: boolean
}

export interface UpdateCommentData {
  body: string
  sources: ContentSourceValue[]
}

export interface UpdateCommentParams {
  id: string
  data: UpdateCommentData
  executor?: DatabaseExecutor
}

export interface SoftDeleteCommentParams {
  id: string
  removedBy: ContentRemoval
  rule?: CommunityRuleValue
  executor?: DatabaseExecutor
}

export interface SetHighlightParams {
  id: string
  note: string | null
  executor: DatabaseExecutor
}

export interface ClearHighlightParams {
  id: string
  executor: DatabaseExecutor
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

export interface ViewerCommentReactionsParams {
  viewerId: string
  commentIds: readonly string[]
}

export interface ViewerCommentReactionRow {
  commentId: string | null
  kind: ReactionKindValue
}

// Removed comments stay listed only while they still anchor replies.
const isListedTopLevel = or(isNull(comments.deletedAt), gt(comments.replyCount, 0))

const relevanceScore = sql`${RELEVANCE_WEIGHTS.goodArgument} * ${comments.goodArgumentCount}
  + ${RELEVANCE_WEIGHTS.changedMyMind} * ${comments.changedMyMindCount}
  + ${RELEVANCE_WEIGHTS.insightful} * ${comments.insightfulCount}
  + ${RELEVANCE_WEIGHTS.reply} * ${comments.replyCount}`

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

  listTopLevelByRecency({
    postId,
    beforeId,
    limit,
  }: ListTopLevelByRecencyParams): Promise<Comment[]> {
    return this.db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.postId, postId),
          isNull(comments.parentId),
          isListedTopLevel,
          beforeId ? lt(comments.id, beforeId) : undefined,
        ),
      )
      .orderBy(desc(comments.id))
      .limit(limit)
  }

  // Highlighted contributions first, then the ones that moved the conversation the most.
  listTopLevelByRelevance({
    postId,
    offset,
    limit,
  }: ListTopLevelByRelevanceParams): Promise<Comment[]> {
    return this.db
      .select()
      .from(comments)
      .where(and(eq(comments.postId, postId), isNull(comments.parentId), isListedTopLevel))
      .orderBy(
        sql`${comments.highlightedAt} desc nulls last`,
        desc(relevanceScore),
        asc(comments.id),
      )
      .offset(offset)
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

  listByAuthor({
    authorId,
    beforeId,
    limit,
    onlyHighlighted,
  }: ListByAuthorParams): Promise<Comment[]> {
    return this.db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.authorId, authorId),
          isNull(comments.deletedAt),
          onlyHighlighted ? isNotNull(comments.highlightedAt) : undefined,
          beforeId ? lt(comments.id, beforeId) : undefined,
        ),
      )
      .orderBy(desc(comments.id))
      .limit(limit)
  }

  listActiveByAuthor(authorId: string): Promise<Comment[]> {
    return this.db
      .select()
      .from(comments)
      .where(and(eq(comments.authorId, authorId), isNull(comments.deletedAt)))
  }

  async update({
    id,
    data,
    executor = this.db,
  }: UpdateCommentParams): Promise<Comment | undefined> {
    const [comment] = await executor
      .update(comments)
      .set({ ...data, editedAt: new Date() })
      .where(and(eq(comments.id, id), isNull(comments.deletedAt)))
      .returning()

    return comment
  }

  async setHighlight({ id, note, executor }: SetHighlightParams): Promise<boolean> {
    const updated = await executor
      .update(comments)
      .set({ highlightedAt: new Date(), highlightNote: note })
      .where(and(eq(comments.id, id), isNull(comments.highlightedAt), isNull(comments.deletedAt)))
      .returning({ id: comments.id })

    return updated.length > 0
  }

  async clearHighlight({ id, executor }: ClearHighlightParams): Promise<boolean> {
    const updated = await executor
      .update(comments)
      .set({ highlightedAt: null, highlightNote: null })
      .where(and(eq(comments.id, id), isNotNull(comments.highlightedAt)))
      .returning({ id: comments.id })

    return updated.length > 0
  }

  async softDelete({
    id,
    removedBy,
    rule,
    executor = this.db,
  }: SoftDeleteCommentParams): Promise<Comment | undefined> {
    const [deleted] = await executor
      .update(comments)
      .set({
        body: null,
        sources: [],
        deletedAt: new Date(),
        removedBy,
        removalRule: rule ?? null,
        highlightedAt: null,
        highlightNote: null,
      })
      .where(and(eq(comments.id, id), isNull(comments.deletedAt)))
      .returning()

    return deleted
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

  // Reads the viewer's own reactions (owned by the reactions module) to fill the view.
  listViewerReactions({
    viewerId,
    commentIds,
  }: ViewerCommentReactionsParams): Promise<ViewerCommentReactionRow[]> {
    if (commentIds.length === 0) return Promise.resolve([])

    return this.db
      .select({ commentId: reactions.commentId, kind: reactions.kind })
      .from(reactions)
      .where(and(eq(reactions.userId, viewerId), inArray(reactions.commentId, [...commentIds])))
  }
}
