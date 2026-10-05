import { Inject, Injectable } from "@nestjs/common"
import type { Database } from "@ponto/database"
import { ApiErrorCode, type FollowStatus, type Page, type PublicProfile } from "@ponto/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  FollowsRepository,
  type FollowConnection,
  type ListFollowConnectionsParams,
} from "#src/modules/follows/repositories/follows.repository.js"
import { toPublicProfile, type User } from "#src/modules/users/domain/user.js"
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
  ) {}

  async follow({ followerId, handle }: FollowByHandleParams): Promise<void> {
    const followee = await this.usersService.getByHandle(handle)

    if (followee.id === followerId) throw new AppError(ApiErrorCode.SELF_FOLLOW_NOT_ALLOWED)

    await this.db.transaction(async (tx) => {
      const isAdded = await this.followsRepository.add({
        followerId,
        followeeId: followee.id,
        executor: tx,
      })

      if (isAdded) {
        await this.usersService.adjustFollowCounts({
          followerId,
          followeeId: followee.id,
          delta: 1,
          executor: tx,
        })
      }
    })
  }

  async unfollow({ followerId, handle }: FollowByHandleParams): Promise<void> {
    const followee = await this.usersService.getByHandle(handle)

    await this.db.transaction(async (tx) => {
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
    })
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
