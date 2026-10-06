import { Inject, Injectable } from "@nestjs/common"
import {
  notifications,
  type Database,
  type DatabaseExecutor,
  type NotificationTypeValue,
} from "@ponto/database"
import { and, count, desc, eq, isNull, lt } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Notification } from "#src/modules/notifications/domain/notification.js"

export interface CreateNotificationData {
  recipientId: string
  actorId: string
  type: NotificationTypeValue
  postId: string | null
  commentId: string | null
}

export interface CreateNotificationParams {
  data: CreateNotificationData
  executor?: DatabaseExecutor
}

export interface ListNotificationsParams {
  recipientId: string
  beforeId: string | undefined
  limit: number
}

export interface MarkNotificationReadParams {
  recipientId: string
  notificationId: string
}

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create({ data, executor = this.db }: CreateNotificationParams): Promise<void> {
    await executor.insert(notifications).values(data)
  }

  listForRecipient({
    recipientId,
    beforeId,
    limit,
  }: ListNotificationsParams): Promise<Notification[]> {
    return this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          beforeId ? lt(notifications.id, beforeId) : undefined,
        ),
      )
      .orderBy(desc(notifications.id))
      .limit(limit)
  }

  async countUnread(recipientId: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt)))

    return result?.value ?? 0
  }

  async markRead({ recipientId, notificationId }: MarkNotificationReadParams): Promise<boolean> {
    const updated = await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.recipientId, recipientId),
          isNull(notifications.readAt),
        ),
      )
      .returning({ id: notifications.id })

    return updated.length > 0
  }

  async markAllRead(recipientId: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt)))
  }

  async exists({ recipientId, notificationId }: MarkNotificationReadParams): Promise<boolean> {
    const [row] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, recipientId)))

    return row !== undefined
  }
}
