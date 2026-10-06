import { Inject, Injectable } from "@nestjs/common"
import {
  comments,
  moderationActions,
  notificationPreferences,
  notifications,
  posts,
  users,
  type Database,
  type DatabaseExecutor,
  type NotificationPreferencesRow,
  type NotificationTypeValue,
} from "@ponto/database"
import { and, count, desc, eq, gt, inArray, isNull, lte, or, sql, type SQL } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type {
  Notification,
  NotificationContextRow,
} from "#src/modules/notifications/domain/notification.js"

export interface CreateNotificationData {
  recipientId: string
  actorId: string | null
  type: NotificationTypeValue
  postId: string | null
  commentId: string | null
  moderationActionId: string | null
  visibleAt: Date
}

export interface CreateNotificationParams {
  data: CreateNotificationData
  executor: DatabaseExecutor
}

export interface FindGroupParams {
  recipientId: string
  type: NotificationTypeValue
  postId: string | null
  commentId: string | null
  since: Date
  executor: DatabaseExecutor
}

export interface AddActorParams {
  notification: Notification
  actorId: string
  visibleAt: Date
  executor: DatabaseExecutor
}

export interface ListNotificationsParams {
  recipientId: string
  types: readonly NotificationTypeValue[] | undefined
  before: NotificationPosition | undefined
  limit: number
}

export interface NotificationPosition {
  visibleAt: Date
  id: string
}

export interface MarkNotificationReadParams {
  recipientId: string
  notificationId: string
}

export interface RecipientSettings {
  preferences: NotificationPreferencesRow | undefined
  timezone: string
}

export interface DeleteInvolvingParams {
  userId: string
  executor: DatabaseExecutor
}

export interface FindRecipientSettingsParams {
  userId: string
  executor?: DatabaseExecutor
}

export interface SavePreferencesParams {
  userId: string
  data: Partial<Omit<NotificationPreferencesRow, "userId" | "updatedAt">>
}

function isVisible(): SQL {
  return lte(notifications.visibleAt, sql`now()`)
}

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create({ data, executor }: CreateNotificationParams): Promise<void> {
    await executor.insert(notifications).values(data)
  }

  // Locks the group row so concurrent events on the same target add up instead of racing.
  async findOpenGroup({
    recipientId,
    type,
    postId,
    commentId,
    since,
    executor,
  }: FindGroupParams): Promise<Notification | undefined> {
    const [row] = await executor
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          eq(notifications.type, type),
          postId ? eq(notifications.postId, postId) : isNull(notifications.postId),
          commentId ? eq(notifications.commentId, commentId) : isNull(notifications.commentId),
          isNull(notifications.readAt),
          gt(notifications.createdAt, since),
        ),
      )
      .orderBy(desc(notifications.id))
      .limit(1)
      .for("update")

    return row
  }

  async addActor({ notification, actorId, visibleAt, executor }: AddActorParams): Promise<void> {
    await executor
      .update(notifications)
      .set({
        previousActorId: notification.actorId,
        actorId,
        actorCount: sql`${notifications.actorCount} + 1`,
        visibleAt,
      })
      .where(eq(notifications.id, notification.id))
  }

  async findRecipientSettings({
    userId,
    executor = this.db,
  }: FindRecipientSettingsParams): Promise<RecipientSettings> {
    const [row] = await executor
      .select({ preferences: notificationPreferences, timezone: users.timezone })
      .from(users)
      .leftJoin(notificationPreferences, eq(notificationPreferences.userId, users.id))
      .where(eq(users.id, userId))

    return { preferences: row?.preferences ?? undefined, timezone: row?.timezone ?? "UTC" }
  }

  async findPreferences(userId: string): Promise<NotificationPreferencesRow | undefined> {
    const [row] = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))

    return row
  }

  async savePreferences({
    userId,
    data,
  }: SavePreferencesParams): Promise<NotificationPreferencesRow> {
    const [row] = await this.db
      .insert(notificationPreferences)
      .values({ userId, ...data })
      .onConflictDoUpdate({ target: notificationPreferences.userId, set: data })
      .returning()

    if (!row) throw new Error("Upsert into notification_preferences returned no row")

    return row
  }

  // Read model: joins the post, comment and moderation action each notification points to,
  // so a page is rendered with one query plus one batch of users.
  listForRecipient({
    recipientId,
    types,
    before,
    limit,
  }: ListNotificationsParams): Promise<NotificationContextRow[]> {
    return this.db
      .select({
        notification: notifications,
        postTitle: posts.title,
        postBody: posts.body,
        postAuthorId: posts.authorId,
        postDeletedAt: posts.deletedAt,
        commentBody: comments.body,
        actionRule: moderationActions.rule,
        actionType: moderationActions.type,
      })
      .from(notifications)
      .leftJoin(posts, eq(posts.id, notifications.postId))
      .leftJoin(comments, eq(comments.id, notifications.commentId))
      .leftJoin(moderationActions, eq(moderationActions.id, notifications.moderationActionId))
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          isVisible(),
          types ? inArray(notifications.type, [...types]) : undefined,
          before
            ? or(
                sql`${notifications.visibleAt} < ${before.visibleAt}`,
                and(
                  eq(notifications.visibleAt, before.visibleAt),
                  sql`${notifications.id} < ${before.id}`,
                ),
              )
            : undefined,
        ),
      )
      .orderBy(desc(notifications.visibleAt), desc(notifications.id))
      .limit(limit)
  }

  async countUnread(recipientId: string): Promise<number> {
    const [result] = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt), isVisible()),
      )

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
      .where(
        and(eq(notifications.recipientId, recipientId), isNull(notifications.readAt), isVisible()),
      )
  }

  async exists({ recipientId, notificationId }: MarkNotificationReadParams): Promise<boolean> {
    const [row] = await this.db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, recipientId)))

    return row !== undefined
  }

  async deleteInvolving({ userId, executor }: DeleteInvolvingParams): Promise<void> {
    await executor
      .delete(notifications)
      .where(or(eq(notifications.recipientId, userId), eq(notifications.actorId, userId)))

    await executor.delete(notificationPreferences).where(eq(notificationPreferences.userId, userId))
  }
}
