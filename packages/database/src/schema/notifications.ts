import { sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { comments } from "./comments.js"
import { moderationActions } from "./moderation.js"
import { posts } from "./posts.js"
import { users } from "./users.js"

export const notificationType = pgEnum("notification_type", [
  "post_commented",
  "comment_replied",
  "post_reacted",
  "comment_reacted",
  "user_followed",
  "mentioned",
  "comment_highlighted",
  "source_requested",
  "content_removed",
  "report_resolved",
])

export const notifications = pgTable(
  "notifications",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    recipientId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid().references(() => users.id, { onDelete: "cascade" }),
    // Repeated events on the same target are grouped into one unread row: actorId is the
    // latest actor, previousActorId the one before, actorCount everyone so far.
    previousActorId: uuid().references(() => users.id, { onDelete: "set null" }),
    actorCount: integer().notNull().default(1),
    type: notificationType().notNull(),
    postId: uuid().references(() => posts.id, { onDelete: "cascade" }),
    commentId: uuid().references(() => comments.id, { onDelete: "cascade" }),
    moderationActionId: uuid().references(() => moderationActions.id, { onDelete: "set null" }),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    // Digest hours delay when a notification shows up; moderation decisions never wait.
    visibleAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_recipient_visible_at_id_idx").on(
      table.recipientId,
      table.visibleAt,
      table.id,
    ),
    index("notifications_unread_group_idx")
      .on(table.recipientId, table.type, table.postId, table.commentId)
      .where(sql`${table.readAt} is null`),
    index("notifications_unread_recipient_id_idx")
      .on(table.recipientId)
      .where(sql`${table.readAt} is null`),
  ],
)

export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  replies: boolean().notNull().default(true),
  mentions: boolean().notNull().default(true),
  highlights: boolean().notNull().default(true),
  sourceRequests: boolean().notNull().default(true),
  reactions: boolean().notNull().default(false),
  follows: boolean().notNull().default(false),
  digestHours: smallint()
    .array()
    .notNull()
    .default(sql`'{}'::smallint[]`),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type NotificationPreferencesRow = typeof notificationPreferences.$inferSelect
export type NotificationRow = typeof notifications.$inferSelect
export type NotificationTypeValue = (typeof notificationType.enumValues)[number]
