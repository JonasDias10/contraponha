import { Inject, Injectable } from "@nestjs/common"
import { reactions, type Database, type DatabaseExecutor } from "@ponto/database"
import { ReactionTargetType, type ReactionKind } from "@ponto/types"
import { and, eq, inArray, type SQL } from "drizzle-orm"

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
}
