import { Inject, Injectable } from "@nestjs/common"
import { runTransaction, type Database, type DatabaseExecutor } from "@contraponha/database"
import {
  ApiErrorCode,
  type FollowStatus,
  type Page,
  type PublicProfile,
  type FollowedAmong,
} from "@contraponha/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  FollowsRepository,
  type FollowConnection,
  type ListFollowConnectionsParams,
} from "#src/modules/follows/repositories/follows.repository.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"
import { toPublicProfile, type User } from "#src/modules/users/domain/user.js"
import { UserRelationsService } from "#src/modules/users/services/user-relations.service.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const followCursorSchema = z.object({ createdAt: z.iso.datetime(), userId: z.uuid() })

export interface FollowByHandleParams {
  followerId: string
  handle: string
}

export interface ListConnectionsByHandleParams {
  handle: string
  cursor: string | undefined
  limit: number
}

export interface FollowedAmongRequest {
  followerId: string
  userIds: readonly string[]
}

export interface SeverFollowsParams {
  userId: string
  otherId: string
  executor: DatabaseExecutor
}

export interface PurgeFollowsParams {
  userId: string
  executor: DatabaseExecutor
}

interface ConnectionWithUser {
  connection: FollowConnection
  user: User
}

interface ListConnectionsParams extends ListConnectionsByHandleParams {
  load: (params: ListFollowConnectionsParams) => Promise<FollowConnection[]>
}

@Injectable()
export class FollowsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly followsRepository: FollowsRepository,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly relations: UserRelationsService,
  ) {}

  // Account deletion: removes every follow in both directions and keeps the other
  // person's counters exact.
  async purgeUser({ userId, executor }: PurgeFollowsParams): Promise<void> {
    const pairs = await this.followsRepository.listPairsInvolving(userId)

    for (const pair of pairs) {
      const isRemoved = await this.followsRepository.remove({ ...pair, executor })

      if (isRemoved) await this.usersService.adjustFollowCounts({ ...pair, delta: -1, executor })
    }
  }

  async follow({ followerId, handle }: FollowByHandleParams): Promise<void> {
    const followee = await this.usersService.getByHandle(handle)

    if (followee.id === followerId) throw new AppError(ApiErrorCode.SELF_FOLLOW_NOT_ALLOWED)

    await this.relations.assertCanInteract({ actorId: followerId, targetId: followee.id })

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const isAdded = await this.followsRepository.add({
          followerId,
          followeeId: followee.id,
          executor: tx,
        })

        if (!isAdded) return

        await this.usersService.adjustFollowCounts({
          followerId,
          followeeId: followee.id,
          delta: 1,
          executor: tx,
        })

        await this.notificationsService.notify({
          recipientId: followee.id,
          actorId: followerId,
          type: "user_followed",
          executor: tx,
        })
      },
    })
  }

  // Blocking: removes the follow in both directions, keeping both people's counters exact.
  async severBetween({ userId, otherId, executor }: SeverFollowsParams): Promise<void> {
    const pairs = [
      { followerId: userId, followeeId: otherId },
      { followerId: otherId, followeeId: userId },
    ]

    for (const pair of pairs) {
      const isRemoved = await this.followsRepository.remove({ ...pair, executor })

      if (isRemoved) await this.usersService.adjustFollowCounts({ ...pair, delta: -1, executor })
    }
  }

  async unfollow({ followerId, handle }: FollowByHandleParams): Promise<void> {
    const followee = await this.usersService.getByHandle(handle)

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const isRemoved = await this.followsRepository.remove({
          followerId,
          followeeId: followee.id,
          executor: tx,
        })

        if (isRemoved) {
          await this.usersService.adjustFollowCounts({
            followerId,
            followeeId: followee.id,
            delta: -1,
            executor: tx,
          })
        }
      },
    })
  }

  listFolloweeIds(followerId: string): Promise<string[]> {
    return this.followsRepository.listFolloweeIds(followerId)
  }

  async followedAmong({ followerId, userIds }: FollowedAmongRequest): Promise<FollowedAmong> {
    const followed = await this.followsRepository.listFollowedAmong({
      followerId,
      followeeIds: userIds,
    })

    return { userIds: followed }
  }

  async getStatus({ followerId, handle }: FollowByHandleParams): Promise<FollowStatus> {
    const followee = await this.usersService.getByHandle(handle)
    const isFollowing = await this.followsRepository.exists({ followerId, followeeId: followee.id })
    return { isFollowing }
  }

  listFollowers(params: ListConnectionsByHandleParams): Promise<Page<PublicProfile>> {
    return this.listConnections({
      ...params,
      load: (query) => this.followsRepository.listFollowers(query),
    })
  }

  listFollowing(params: ListConnectionsByHandleParams): Promise<Page<PublicProfile>> {
    return this.listConnections({
      ...params,
      load: (query) => this.followsRepository.listFollowing(query),
    })
  }

  private async listConnections({
    handle,
    cursor,
    limit,
    load,
  }: ListConnectionsParams): Promise<Page<PublicProfile>> {
    const user = await this.usersService.getByHandle(handle)
    const position = decodeCursor({ cursor, schema: followCursorSchema })
    const connections = await load({ userId: user.id, before: position, limit: limit + 1 })
    const users = await this.usersService.findByIds(connections.map(({ userId }) => userId))

    const rows = connections.flatMap((connection): ConnectionWithUser[] => {
      const connectedUser = users.get(connection.userId)
      return connectedUser ? [{ connection, user: connectedUser }] : []
    })

    return buildPage({
      rows,
      limit,
      toItem: (row) => toPublicProfile(row.user),
      toCursor: (row) => ({
        createdAt: row.connection.createdAt.toISOString(),
        userId: row.connection.userId,
      }),
    })
  }
}
