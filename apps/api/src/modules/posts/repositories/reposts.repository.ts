import { Inject, Injectable } from "@nestjs/common"
import { reposts, type Database, type DatabaseExecutor } from "@contraponha/database"
import { and, eq, inArray } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface RepostPairParams {
  userId: string
  postId: string
  executor?: DatabaseExecutor
}

export interface RepostedAmongParams {
  userId: string
  postIds: readonly string[]
}

export interface DeleteRepostsByUserParams {
  userId: string
  executor: DatabaseExecutor
}

@Injectable()
export class RepostsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async add({ userId, postId, executor = this.db }: RepostPairParams): Promise<boolean> {
    const added = await executor
      .insert(reposts)
      .values({ userId, postId })
      .onConflictDoNothing()
      .returning({ id: reposts.id })

    return added.length > 0
  }

  async remove({ userId, postId, executor = this.db }: RepostPairParams): Promise<boolean> {
    const removed = await executor
      .delete(reposts)
      .where(and(eq(reposts.userId, userId), eq(reposts.postId, postId)))
      .returning({ id: reposts.id })

    return removed.length > 0
  }

  async repostedAmong({ userId, postIds }: RepostedAmongParams): Promise<Set<string>> {
    if (postIds.length === 0) return new Set()

    const rows = await this.db
      .select({ postId: reposts.postId })
      .from(reposts)
      .where(and(eq(reposts.userId, userId), inArray(reposts.postId, [...postIds])))

    return new Set(rows.map(({ postId }) => postId))
  }

  // Account deletion: returns the reposted post ids so their counters can be lowered.
  async deleteByUser({ userId, executor }: DeleteRepostsByUserParams): Promise<string[]> {
    const removed = await executor
      .delete(reposts)
      .where(eq(reposts.userId, userId))
      .returning({ postId: reposts.postId })

    return removed.map(({ postId }) => postId)
  }
}
