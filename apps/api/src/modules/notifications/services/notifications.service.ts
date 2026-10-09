import { Inject, Injectable } from "@nestjs/common"
import {
  runTransaction,
  type Database,
  type DatabaseExecutor,
  type NotificationTypeValue,
} from "@contraponha/database"
import {
  ApiErrorCode,
  NotificationFilter,
  type NotificationPreferences,
  type NotificationView,
  type Page,
  type UnreadNotificationCount,
} from "@contraponha/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  isGroupable,
  isModeration,
  isWanted,
  MENTION_TYPES,
  MODERATION_TYPES,
  nextDigestAt,
  toNotificationPreferences,
  toNotificationView,
} from "#src/modules/notifications/domain/notification.js"
import {
  NotificationsRepository,
  type SavePreferencesParams,
} from "#src/modules/notifications/repositories/notifications.repository.js"
import type { User } from "#src/modules/users/domain/user.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const notificationCursorSchema = z.object({ visibleAt: z.iso.datetime(), id: z.uuid() })

const GROUP_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const TYPES_BY_FILTER: Record<NotificationFilter, readonly NotificationTypeValue[] | undefined> = {
  [NotificationFilter.ALL]: undefined,
  [NotificationFilter.MENTIONS]: MENTION_TYPES,
  [NotificationFilter.MODERATION]: MODERATION_TYPES,
}

export interface NotifyParams {
  recipientId: string
  actorId: string | null
  type: NotificationTypeValue
  postId?: string
  commentId?: string
  moderationActionId?: string
  executor?: DatabaseExecutor
}

export interface ListNotificationsForUserParams {
  userId: string
  filter: NotificationFilter
  cursor: string | undefined
  limit: number
}

export interface MarkReadParams {
  userId: string
  notificationId: string
}

export interface UpdatePreferencesParams {
  userId: string
  data: SavePreferencesParams["data"]
}

interface StoreNotificationParams {
  params: NotifyParams
  visibleAt: Date
  executor: DatabaseExecutor
}

export interface DuePush {
  recipient: User
  notification: NotificationView
}

export interface PurgeNotificationsParams {
  userId: string
  executor: DatabaseExecutor
}

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly notificationsRepository: NotificationsRepository,
    private readonly usersService: UsersService,
  ) {}

  // Called inside the transaction of the action being notified, so a rolled-back comment,
  // reaction or follow never leaves a notification behind. Nobody is notified of their own
  // actions, switched-off types are skipped and digest hours set when it becomes visible.
  async notify(params: NotifyParams): Promise<void> {
    const { recipientId, actorId, type, executor } = params

    if (recipientId === actorId) return

    // Read through the caller's transaction: a second pooled connection per transaction
    // would exhaust the pool under load.
    const settings = await this.notificationsRepository.findRecipientSettings({
      userId: recipientId,
      executor,
    })

    const preferences = toNotificationPreferences(settings.preferences)

    if (!isWanted({ type, preferences })) return

    const now = new Date()

    const visibleAt = isModeration(type)
      ? now
      : nextDigestAt({ now, hours: preferences.digestHours, timeZone: settings.timezone })

    if (executor) {
      await this.store({ params, visibleAt, executor })

      return
    }

    await runTransaction({
      db: this.db,
      work: (tx) => this.store({ params, visibleAt, executor: tx }),
    })
  }

  async list({
    userId,
    filter,
    cursor,
    limit,
  }: ListNotificationsForUserParams): Promise<Page<NotificationView>> {
    const position = decodeCursor({ cursor, schema: notificationCursorSchema })

    const rows = await this.notificationsRepository.listForRecipient({
      recipientId: userId,
      types: TYPES_BY_FILTER[filter],
      before: position ? { visibleAt: new Date(position.visibleAt), id: position.id } : undefined,
      limit: limit + 1,
    })

    const userIds = rows.flatMap(({ notification, postAuthorId }) =>
      [notification.actorId, notification.previousActorId, postAuthorId].filter(
        (id): id is string => id !== null,
      ),
    )

    const users = await this.usersService.findByIds(userIds)

    return buildPage({
      rows,
      limit,
      toItem: (row) => toNotificationView({ row, users }),
      toCursor: ({ notification }) => ({
        visibleAt: notification.visibleAt.toISOString(),
        id: notification.id,
      }),
    })
  }

  // Claims notifications that became visible and still need a push, with what is needed
  // to write it: the recipient (language) and the same view the app shows.
  async claimDuePushes(limit: number): Promise<DuePush[]> {
    const rows = await this.notificationsRepository.claimDuePushes({ limit })

    const userIds = rows.flatMap(({ notification, postAuthorId }) =>
      [
        notification.recipientId,
        notification.actorId,
        notification.previousActorId,
        postAuthorId,
      ].filter((id): id is string => id !== null),
    )

    const users = await this.usersService.findByIds(userIds)

    return rows.flatMap((row) => {
      const recipient = users.get(row.notification.recipientId)

      return recipient ? [{ recipient, notification: toNotificationView({ row, users }) }] : []
    })
  }

  async countUnread(userId: string): Promise<UnreadNotificationCount> {
    const unread = await this.notificationsRepository.countUnread(userId)
    return { count: unread }
  }

  async markRead({ userId, notificationId }: MarkReadParams): Promise<void> {
    const isMarked = await this.notificationsRepository.markRead({
      recipientId: userId,
      notificationId,
    })

    if (isMarked) return

    const isOwned = await this.notificationsRepository.exists({
      recipientId: userId,
      notificationId,
    })

    if (!isOwned) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)
  }

  markAllRead(userId: string): Promise<void> {
    return this.notificationsRepository.markAllRead(userId)
  }

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    const row = await this.notificationsRepository.findPreferences(userId)
    return toNotificationPreferences(row)
  }

  async updatePreferences({
    userId,
    data,
  }: UpdatePreferencesParams): Promise<NotificationPreferences> {
    const row = await this.notificationsRepository.savePreferences({ userId, data })
    return toNotificationPreferences(row)
  }

  purgeUser({ userId, executor }: PurgeNotificationsParams): Promise<void> {
    return this.notificationsRepository.deleteInvolving({ userId, executor })
  }

  private async store({ params, visibleAt, executor }: StoreNotificationParams): Promise<void> {
    const { recipientId, actorId, type } = params
    const postId = params.postId ?? null
    const commentId = params.commentId ?? null

    if (actorId && isGroupable(type)) {
      const group = await this.notificationsRepository.findOpenGroup({
        recipientId,
        type,
        postId,
        commentId,
        since: new Date(Date.now() - GROUP_WINDOW_MS),
        executor,
      })

      if (group) {
        if (group.actorId === actorId || group.previousActorId === actorId) return

        await this.notificationsRepository.addActor({
          notification: group,
          actorId,
          visibleAt,
          executor,
        })

        return
      }
    }

    await this.notificationsRepository.create({
      data: {
        recipientId,
        actorId,
        type,
        postId,
        commentId,
        moderationActionId: params.moderationActionId ?? null,
        visibleAt,
      },
      executor,
    })
  }
}
