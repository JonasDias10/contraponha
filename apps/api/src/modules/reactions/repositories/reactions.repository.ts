import { Inject, Injectable } from "@nestjs/common"
import { reactions, type Database, type DatabaseExecutor } from "@ponto/database"
import { ReactionTargetType, type ReactionKind } from "@ponto/types"
import { and, count, eq, inArray, sql, type SQL } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface ReactionTarget {
  type: ReactionTargetType
  id: string
}

export interface ReactionWriteParams {
  target: ReactionTarget
  userId: string
  kind: ReactionKind
  executor?: DatabaseExecutor
}

export interface ListUserReactionsParams {
  userId: string
  targetType: ReactionTargetType
  targetIds: readonly string[]
}

export interface UserTargetParams {
  target: ReactionTarget
  userId: string
  executor: DatabaseExecutor
}

export interface DeleteAllByUserParams {
  userId: string
  executor: DatabaseExecutor
}

export interface ReactionByUserRow {
  postId: string | null
  commentId: string | null
  kind: ReactionKind
}

export interface UserReactionRow {
  targetId: string | null
  kind: ReactionKind
}

type TargetColumn = typeof reactions.postId | typeof reactions.commentId

function targetColumn(type: ReactionTargetType): TargetColumn {
  return type === ReactionTargetType.POST ? reactions.postId : reactions.commentId
}

function matchesReaction({ target, userId, kind }: ReactionWriteParams): SQL | undefined {
  return and(
    eq(targetColumn(target.type), target.id),
    eq(reactions.userId, userId),
    eq(reactions.kind, kind),
  )
}

@Injectable()
export class ReactionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async add(params: ReactionWriteParams): Promise<boolean> {
    const { target, userId, kind, executor = this.db } = params
    const isPost = target.type === ReactionTargetType.POST

    const inserted = await executor
      .insert(reactions)
      .values({
        userId,
        kind,
        postId: isPost ? target.id : null,
        commentId: isPost ? null : target.id,
      })
      .onConflictDoNothing()
      .returning({ id: reactions.id })

    return inserted.length > 0
  }

  async remove(params: ReactionWriteParams): Promise<boolean> {
    const { executor = this.db } = params

    const removed = await executor
      .delete(reactions)
      .where(matchesReaction(params))
      .returning({ id: reactions.id })

    return removed.length > 0
  }

  listByUser({
    userId,
    targetType,
    targetIds,
  }: ListUserReactionsParams): Promise<UserReactionRow[]> {
    const column = targetColumn(targetType)

    return this.db
      .select({ targetId: column, kind: reactions.kind })
      .from(reactions)
      .where(and(eq(reactions.userId, userId), inArray(column, [...targetIds])))
  }

  // Serializes reactions of one person on one target, so the per-target limit holds even
  // when two requests arrive together.
  async lockUserTarget({ target, userId, executor }: UserTargetParams): Promise<void> {
    await executor.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${target.id}`}, 0))`,
    )
  }

  async countByUserOnTarget({ target, userId, executor }: UserTargetParams): Promise<number> {
    const [row] = await executor
      .select({ total: count() })
      .from(reactions)
      .where(and(eq(targetColumn(target.type), target.id), eq(reactions.userId, userId)))

    return row?.total ?? 0
  }

  listAllByUser(userId: string): Promise<ReactionByUserRow[]> {
    return this.db
      .select({ postId: reactions.postId, commentId: reactions.commentId, kind: reactions.kind })
      .from(reactions)
      .where(eq(reactions.userId, userId))
  }

  async deleteAllByUser({ userId, executor }: DeleteAllByUserParams): Promise<void> {
    await executor.delete(reactions).where(eq(reactions.userId, userId))
  }
}
