import { Inject, Injectable } from "@nestjs/common"
import {
  suspensions,
  type CommunityRuleValue,
  type Database,
  type DatabaseExecutor,
} from "@contraponha/database"
import { and, count, desc, eq, gt, inArray, isNull, or } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Suspension } from "#src/modules/users/domain/suspension.js"

export interface CreateSuspensionData {
  userId: string
  moderatorId: string
  rule: CommunityRuleValue
  note: string | null
  endsAt: Date | null
}

export interface CreateSuspensionParams {
  data: CreateSuspensionData
  executor: DatabaseExecutor
}

export interface CloseOpenSuspensionParams {
  userId: string
  liftedById: string
  executor: DatabaseExecutor
}

@Injectable()
export class SuspensionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create({ data, executor }: CreateSuspensionParams): Promise<Suspension> {
    const [row] = await executor.insert(suspensions).values(data).returning()

    if (!row) throw new Error("Insert into suspensions returned no row")

    return row
  }

  // Closes the row that is not lifted yet, whether it is still running or already expired.
  async closeOpen({
    userId,
    liftedById,
    executor,
  }: CloseOpenSuspensionParams): Promise<Suspension | undefined> {
    const [row] = await executor
      .update(suspensions)
      .set({ liftedAt: new Date(), liftedById })
      .where(and(eq(suspensions.userId, userId), isNull(suspensions.liftedAt)))
      .returning()

    return row
  }

  async findOpen(userId: string): Promise<Suspension | undefined> {
    const [row] = await this.db
      .select()
      .from(suspensions)
      .where(and(eq(suspensions.userId, userId), isNull(suspensions.liftedAt)))

    return row
  }

  findOpenForUsers(userIds: readonly string[]): Promise<Suspension[]> {
    if (userIds.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(suspensions)
      .where(and(inArray(suspensions.userId, [...userIds]), isNull(suspensions.liftedAt)))
  }

  listForUser(userId: string): Promise<Suspension[]> {
    return this.db
      .select()
      .from(suspensions)
      .where(eq(suspensions.userId, userId))
      .orderBy(desc(suspensions.createdAt))
  }

  async countActive(): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(suspensions)
      .where(
        and(
          isNull(suspensions.liftedAt),
          or(isNull(suspensions.endsAt), gt(suspensions.endsAt, new Date())),
        ),
      )

    return row?.total ?? 0
  }
}
