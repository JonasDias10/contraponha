import { Inject, Injectable } from "@nestjs/common"
import { follows, type Database, type DatabaseExecutor } from "@contraponha/database"
import { type SQL, and, desc, eq, inArray, or, sql } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface FollowPair {
  followerId: string
  followeeId: string
}

export interface FollowedAmongParams {
  followerId: string
  followeeIds: readonly string[]
}

export interface FollowPairParams {
  followerId: string
  followeeId: string
  executor?: DatabaseExecutor
}

export interface FollowPosition {
  createdAt: string
  userId: string
}

export interface ListFollowConnectionsParams {
  userId: string
  before: FollowPosition | undefined
  limit: number
}

export interface FollowConnection {
  userId: string
  createdAt: Date
}

interface ListConnectionsParams extends ListFollowConnectionsParams {
  ownColumn: PgColumn
  otherColumn: PgColumn
}

interface IsBeforeParams {
  position: FollowPosition | undefined
  column: PgColumn
}

function isBefore({ position, column }: IsBeforeParams): SQL | undefined {
  if (!position) return undefined

  return sql`(${follows.createdAt}, ${column}) < (${position.createdAt}::timestamptz, ${position.userId}::uuid)`
}

@Injectable()
export class FollowsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async add({ followerId, followeeId, executor = this.db }: FollowPairParams): Promise<boolean> {
    const inserted = await executor
      .insert(follows)
      .values({ followerId, followeeId })
      .onConflictDoNothing()
      .returning({ followerId: follows.followerId })

    return inserted.length > 0
  }

  async remove({ followerId, followeeId, executor = this.db }: FollowPairParams): Promise<boolean> {
    const removed = await executor
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)))
      .returning({ followerId: follows.followerId })

    return removed.length > 0
  }

  listPairsInvolving(userId: string): Promise<FollowPair[]> {
    return this.db
      .select({ followerId: follows.followerId, followeeId: follows.followeeId })
      .from(follows)
      .where(or(eq(follows.followerId, userId), eq(follows.followeeId, userId)))
  }

  async listFollowedAmong({ followerId, followeeIds }: FollowedAmongParams): Promise<string[]> {
    const rows = await this.db
      .select({ followeeId: follows.followeeId })
      .from(follows)
      .where(and(eq(follows.followerId, followerId), inArray(follows.followeeId, [...followeeIds])))

    return rows.map(({ followeeId }) => followeeId)
  }

  async exists({ followerId, followeeId }: FollowPairParams): Promise<boolean> {
    const [row] = await this.db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followeeId, followeeId)))

    return row !== undefined
  }

  listFollowers(params: ListFollowConnectionsParams): Promise<FollowConnection[]> {
    return this.listConnections({
      ...params,
      ownColumn: follows.followeeId,
      otherColumn: follows.followerId,
    })
  }

  listFollowing(params: ListFollowConnectionsParams): Promise<FollowConnection[]> {
    return this.listConnections({
      ...params,
      ownColumn: follows.followerId,
      otherColumn: follows.followeeId,
    })
  }

  private async listConnections({
    userId,
    before,
    limit,
    ownColumn,
    otherColumn,
  }: ListConnectionsParams): Promise<FollowConnection[]> {
    const rows = await this.db
      .select({ userId: otherColumn, createdAt: follows.createdAt })
      .from(follows)
      .where(and(eq(ownColumn, userId), isBefore({ position: before, column: otherColumn })))
      .orderBy(desc(follows.createdAt), desc(otherColumn))
      .limit(limit)

    return rows.map((row) => ({ userId: String(row.userId), createdAt: row.createdAt }))
  }

  async listFolloweeIds(followerId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: follows.followeeId })
      .from(follows)
      .where(eq(follows.followerId, followerId))

    return rows.map(({ id }) => id)
  }
}
