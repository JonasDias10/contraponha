import { Inject, Injectable } from "@nestjs/common"
import {
  userBlocks,
  userMutes,
  users,
  type Database,
  type DatabaseExecutor,
} from "@contraponha/database"
import { and, desc, eq, lt, or } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { User } from "#src/modules/users/domain/user.js"

export interface RelationPairParams {
  actorId: string
  targetId: string
  executor?: DatabaseExecutor
}

export interface ListRelatedParams {
  userId: string
  beforeId: string | undefined
  limit: number
}

export interface RelationFlags {
  isBlocking: boolean
  isBlockedBy: boolean
  isMuting: boolean
}

@Injectable()
export class UserRelationsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async block({ actorId, targetId, executor = this.db }: RelationPairParams): Promise<void> {
    await executor
      .insert(userBlocks)
      .values({ blockerId: actorId, blockedId: targetId })
      .onConflictDoNothing()
  }

  async unblock({ actorId, targetId, executor = this.db }: RelationPairParams): Promise<void> {
    await executor
      .delete(userBlocks)
      .where(and(eq(userBlocks.blockerId, actorId), eq(userBlocks.blockedId, targetId)))
  }

  async mute({ actorId, targetId, executor = this.db }: RelationPairParams): Promise<void> {
    await executor
      .insert(userMutes)
      .values({ muterId: actorId, mutedId: targetId })
      .onConflictDoNothing()
  }

  async unmute({ actorId, targetId, executor = this.db }: RelationPairParams): Promise<void> {
    await executor
      .delete(userMutes)
      .where(and(eq(userMutes.muterId, actorId), eq(userMutes.mutedId, targetId)))
  }

  async flags({
    actorId,
    targetId,
    executor = this.db,
  }: RelationPairParams): Promise<RelationFlags> {
    const blocks = await executor
      .select({ blockerId: userBlocks.blockerId })
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, actorId), eq(userBlocks.blockedId, targetId)),
          and(eq(userBlocks.blockerId, targetId), eq(userBlocks.blockedId, actorId)),
        ),
      )

    const [mute] = await executor
      .select({ muterId: userMutes.muterId })
      .from(userMutes)
      .where(and(eq(userMutes.muterId, actorId), eq(userMutes.mutedId, targetId)))

    return {
      isBlocking: blocks.some(({ blockerId }) => blockerId === actorId),
      isBlockedBy: blocks.some(({ blockerId }) => blockerId === targetId),
      isMuting: mute !== undefined,
    }
  }

  // People the user blocked, most recent first; the cursor is the blocked person's id.
  async listBlocked({ userId, beforeId, limit }: ListRelatedParams): Promise<User[]> {
    const rows = await this.db
      .select({ user: users })
      .from(userBlocks)
      .innerJoin(users, eq(users.id, userBlocks.blockedId))
      .where(
        and(
          eq(userBlocks.blockerId, userId),
          beforeId ? lt(userBlocks.blockedId, beforeId) : undefined,
        ),
      )
      .orderBy(desc(userBlocks.blockedId))
      .limit(limit)

    return rows.map(({ user }) => user)
  }

  async listMuted({ userId, beforeId, limit }: ListRelatedParams): Promise<User[]> {
    const rows = await this.db
      .select({ user: users })
      .from(userMutes)
      .innerJoin(users, eq(users.id, userMutes.mutedId))
      .where(
        and(eq(userMutes.muterId, userId), beforeId ? lt(userMutes.mutedId, beforeId) : undefined),
      )
      .orderBy(desc(userMutes.mutedId))
      .limit(limit)

    return rows.map(({ user }) => user)
  }
}
