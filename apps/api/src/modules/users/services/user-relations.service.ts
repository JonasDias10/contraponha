import { Injectable } from "@nestjs/common"
import type { DatabaseExecutor } from "@contraponha/database"
import { ApiErrorCode } from "@contraponha/types"

import { AppError } from "#src/common/errors/app-error.js"
import {
  UserRelationsRepository,
  type RelationFlags,
  type RelationPairParams,
} from "#src/modules/users/repositories/user-relations.repository.js"

export interface InteractionParams {
  actorId: string
  targetId: string
  executor?: DatabaseExecutor
}

export interface NotificationAllowedParams {
  recipientId: string
  actorId: string
  executor?: DatabaseExecutor
}

export interface BlockedBetweenParams {
  viewerId: string | undefined
  userId: string
}

// Who may see and reach whom. Blocks work both ways; mutes only affect the muter.
@Injectable()
export class UserRelationsService {
  constructor(private readonly relationsRepository: UserRelationsRepository) {}

  flags(params: RelationPairParams): Promise<RelationFlags> {
    return this.relationsRepository.flags(params)
  }

  // Profiles of people in a block (either way) list nothing to each other.
  async isBlockedBetween({ viewerId, userId }: BlockedBetweenParams): Promise<boolean> {
    if (!viewerId || viewerId === userId) return false

    const { isBlocking, isBlockedBy } = await this.relationsRepository.flags({
      actorId: viewerId,
      targetId: userId,
    })

    return isBlocking || isBlockedBy
  }

  // Following, replying, reacting: refused when either person blocked the other.
  async assertCanInteract({ actorId, targetId, executor }: InteractionParams): Promise<void> {
    if (actorId === targetId) return

    const { isBlocking, isBlockedBy } = await this.relationsRepository.flags({
      actorId,
      targetId,
      executor,
    })

    if (isBlocking || isBlockedBy) throw new AppError(ApiErrorCode.INTERACTION_BLOCKED)
  }

  // A notification is dropped when a block exists either way or the recipient muted the actor.
  async isNotificationAllowed({
    recipientId,
    actorId,
    executor,
  }: NotificationAllowedParams): Promise<boolean> {
    const { isBlocking, isBlockedBy, isMuting } = await this.relationsRepository.flags({
      actorId: recipientId,
      targetId: actorId,
      executor,
    })

    return !isBlocking && !isBlockedBy && !isMuting
  }
}
