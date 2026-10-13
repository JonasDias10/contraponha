import { Inject, Injectable } from "@nestjs/common"
import { runTransaction, type Database } from "@contraponha/database"
import { ApiErrorCode, type Page, type PublicProfile } from "@contraponha/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { FollowsService } from "#src/modules/follows/services/follows.service.js"
import { toPublicProfile, type User } from "#src/modules/users/domain/user.js"
import { UserRelationsRepository } from "#src/modules/users/repositories/user-relations.repository.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const relatedCursorSchema = z.object({ id: z.uuid() })

export interface RelationChangeParams {
  actorId: string
  handle: string
}

export interface ListRelatedRequest {
  userId: string
  cursor?: string
  limit: number
}

interface ToPageParams {
  rows: User[]
  limit: number
}

@Injectable()
export class RelationsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly usersService: UsersService,
    private readonly relationsRepository: UserRelationsRepository,
    private readonly followsService: FollowsService,
  ) {}

  async block({ actorId, handle }: RelationChangeParams): Promise<void> {
    const target = await this.targetOf({ actorId, handle })

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.relationsRepository.block({ actorId, targetId: target.id, executor: tx })

        await this.followsService.severBetween({
          userId: actorId,
          otherId: target.id,
          executor: tx,
        })
      },
    })
  }

  async unblock({ actorId, handle }: RelationChangeParams): Promise<void> {
    const target = await this.targetOf({ actorId, handle })

    await this.relationsRepository.unblock({ actorId, targetId: target.id })
  }

  async mute({ actorId, handle }: RelationChangeParams): Promise<void> {
    const target = await this.targetOf({ actorId, handle })

    await this.relationsRepository.mute({ actorId, targetId: target.id })
  }

  async unmute({ actorId, handle }: RelationChangeParams): Promise<void> {
    const target = await this.targetOf({ actorId, handle })

    await this.relationsRepository.unmute({ actorId, targetId: target.id })
  }

  async listBlocked({ userId, cursor, limit }: ListRelatedRequest): Promise<Page<PublicProfile>> {
    const position = decodeCursor({ cursor, schema: relatedCursorSchema })

    const rows = await this.relationsRepository.listBlocked({
      userId,
      beforeId: position?.id,
      limit: limit + 1,
    })

    return this.toPage({ rows, limit })
  }

  async listMuted({ userId, cursor, limit }: ListRelatedRequest): Promise<Page<PublicProfile>> {
    const position = decodeCursor({ cursor, schema: relatedCursorSchema })

    const rows = await this.relationsRepository.listMuted({
      userId,
      beforeId: position?.id,
      limit: limit + 1,
    })

    return this.toPage({ rows, limit })
  }

  private async targetOf({ actorId, handle }: RelationChangeParams): Promise<User> {
    const target = await this.usersService.getByHandle(handle)

    if (target.id === actorId) throw new AppError(ApiErrorCode.BAD_REQUEST)

    return target
  }

  private toPage({ rows, limit }: ToPageParams): Page<PublicProfile> {
    return buildPage({ rows, limit, toItem: toPublicProfile, toCursor: ({ id }) => ({ id }) })
  }
}
