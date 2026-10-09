import { Inject, Injectable } from "@nestjs/common"
import { runTransaction, type Database } from "@contraponha/database"
import { ModerationActionType, type AdminTopic } from "@contraponha/types"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { ModerationActionsRepository } from "#src/modules/moderation/repositories/moderation-actions.repository.js"
import type {
  CreateTopicData,
  UpdateTopicParams,
} from "#src/modules/topics/repositories/topics.repository.js"
import { TopicsService } from "#src/modules/topics/services/topics.service.js"

export interface CreateAdminTopicRequest {
  actorId: string
  data: CreateTopicData
}

export interface UpdateAdminTopicRequest {
  actorId: string
  slug: string
  data: UpdateTopicParams["data"]
}

// Topic changes go to the moderation audit trail, so curation is reviewable like any
// other moderator action.
@Injectable()
export class AdminTopicsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly topicsService: TopicsService,
    private readonly actions: ModerationActionsRepository,
  ) {}

  async create({ actorId, data }: CreateAdminTopicRequest): Promise<AdminTopic> {
    const topic = await this.topicsService.create(data)

    await this.actions.record({
      data: {
        moderatorId: actorId,
        type: ModerationActionType.TOPIC_UPDATED,
        note: `created ${topic.slug}${topic.isCurated ? " (curated)" : ""}`,
      },
    })

    return topic
  }

  update({ actorId, slug, data }: UpdateAdminTopicRequest): Promise<AdminTopic> {
    return runTransaction({
      db: this.db,
      work: async (tx) => {
        const topic = await this.topicsService.update({ slug, data, executor: tx })

        const changes = Object.entries(data)
          .filter(([, value]) => value !== undefined)
          .map(([field, value]) => `${field}=${String(value)}`)
          .join(", ")

        await this.actions.record({
          data: {
            moderatorId: actorId,
            type: ModerationActionType.TOPIC_UPDATED,
            note: `${slug}: ${changes}`,
          },
          executor: tx,
        })

        return topic
      },
    })
  }
}
