import { Inject, Injectable } from "@nestjs/common"
import { moderationActions, type Database, type DatabaseExecutor } from "@ponto/database"
import type { ModerationActionType } from "@ponto/types"
import { desc, lt } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { ModerationAction } from "#src/modules/moderation/domain/moderation.js"

export interface ModerationActionData {
  moderatorId: string
  type: ModerationActionType
  reportId?: string
  postId?: string
  commentId?: string
  targetUserId?: string
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

  async record({ data, executor = this.db }: RecordActionParams): Promise<void> {
    await executor.insert(moderationActions).values(data)
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
