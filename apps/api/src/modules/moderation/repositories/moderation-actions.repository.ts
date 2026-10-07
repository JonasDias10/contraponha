import { Inject, Injectable } from "@nestjs/common"
import {
  moderationActions,
  type CommunityRuleValue,
  type Database,
  type DatabaseExecutor,
} from "@contraponha/database"
import type { ModerationActionType } from "@contraponha/types"
import { desc, lt } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { ModerationAction } from "#src/modules/moderation/domain/moderation.js"

export interface ModerationActionData {
  moderatorId: string | null
  type: ModerationActionType
  reportId?: string
  postId?: string
  commentId?: string
  targetUserId?: string
  rule?: CommunityRuleValue
  note?: string
}

export interface RecordActionParams {
  data: ModerationActionData
  executor?: DatabaseExecutor
}

export interface ListActionsParams {
  beforeId: string | undefined
  limit: number
}

// Append-only audit trail: there is deliberately no update or delete here.
@Injectable()
export class ModerationActionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async record({ data, executor = this.db }: RecordActionParams): Promise<string> {
    const [row] = await executor
      .insert(moderationActions)
      .values(data)
      .returning({ id: moderationActions.id })

    if (!row) throw new Error("Insert into moderation_actions returned no row")

    return row.id
  }

  list({ beforeId, limit }: ListActionsParams): Promise<ModerationAction[]> {
    return this.db
      .select()
      .from(moderationActions)
      .where(beforeId ? lt(moderationActions.id, beforeId) : undefined)
      .orderBy(desc(moderationActions.id))
      .limit(limit)
  }
}
