import { Inject, Injectable } from "@nestjs/common"
import { pushTokens, type Database, type PushTokenRow } from "@contraponha/database"
import type { PushPlatform } from "@contraponha/types"
import { and, eq, inArray } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface UpsertPushTokenParams {
  userId: string
  token: string
  platform: PushPlatform
}

export interface DeletePushTokenParams {
  userId: string
  token: string
}

@Injectable()
export class PushTokensRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  // A device that signs in with another account keeps its token but changes owner.
  async upsert({ userId, token, platform }: UpsertPushTokenParams): Promise<void> {
    await this.db
      .insert(pushTokens)
      .values({ userId, token, platform })
      .onConflictDoUpdate({ target: pushTokens.token, set: { userId, platform } })
  }

  async delete({ userId, token }: DeletePushTokenParams): Promise<void> {
    await this.db
      .delete(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)))
  }

  listForUsers(userIds: readonly string[]): Promise<PushTokenRow[]> {
    if (userIds.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(pushTokens)
      .where(inArray(pushTokens.userId, [...userIds]))
  }

  async deleteTokens(tokens: readonly string[]): Promise<void> {
    if (tokens.length === 0) return

    await this.db.delete(pushTokens).where(inArray(pushTokens.token, [...tokens]))
  }

  async deleteForUser(userId: string): Promise<void> {
    await this.db.delete(pushTokens).where(eq(pushTokens.userId, userId))
  }
}
