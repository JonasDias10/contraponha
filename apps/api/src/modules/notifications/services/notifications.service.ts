import { Injectable } from "@nestjs/common"
import type { DatabaseExecutor, NotificationTypeValue } from "@ponto/database"
import {
  ApiErrorCode,
  type NotificationView,
  type Page,
  type UnreadNotificationCount,
} from "@ponto/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { toNotificationView } from "#src/modules/notifications/domain/notification.js"
import { NotificationsRepository } from "#src/modules/notifications/repositories/notifications.repository.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const notificationCursorSchema = z.object({ id: z.uuid() })

export interface NotifyParams {
  recipientId: string
  actorId: string
  type: NotificationTypeValue
  postId?: string
  commentId?: string
  executor?: DatabaseExecutor
}

export interface ListNotificationsForUserParams {
  userId: string
  cursor: string | undefined
  limit: number
}

export interface MarkReadParams {
  userId: string
  notificationId: string
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly usersService: UsersService,
  ) {}

  // Called inside the transaction of the action being notified, so a rolled-back comment,
  // reaction or follow never leaves a notification behind. Nobody is notified of their own actions.
  async notify({
    recipientId,
    actorId,
    type,
    postId,
    commentId,
    executor,
  }: NotifyParams): Promise<void> {
    if (recipientId === actorId) return

    await this.notificationsRepository.create({
      data: { recipientId, actorId, type, postId: postId ?? null, commentId: commentId ?? null },
      executor,
    })
  }

  async list({
    userId,
    cursor,
    limit,
  }: ListNotificationsForUserParams): Promise<Page<NotificationView>> {
    const position = decodeCursor({ cursor, schema: notificationCursorSchema })

    const rows = await this.notificationsRepository.listForRecipient({
      recipientId: userId,
      beforeId: position?.id,
      limit: limit + 1,
    })

    const actors = await this.usersService.findByIds(rows.map(({ actorId }) => actorId))

    return buildPage({
      rows,
      limit,
      toItem: (notification) =>
        toNotificationView({ notification, actor: actors.get(notification.actorId) }),
      toCursor: (notification) => ({ id: notification.id }),
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
}
