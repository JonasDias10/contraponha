import { sql } from "drizzle-orm"
import { index, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core"

import { comments } from "./comments.js"
import { posts } from "./posts.js"
import { users } from "./users.js"

export const notificationType = pgEnum("notification_type", [
  "post_commented",
  "comment_replied",
  "post_reacted",
  "comment_reacted",
  "user_followed",
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
    actorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationType().notNull(),
    postId: uuid().references(() => posts.id, { onDelete: "cascade" }),
    commentId: uuid().references(() => comments.id, { onDelete: "cascade" }),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("notifications_recipient_id_id_idx").on(table.recipientId, table.id),
    index("notifications_unread_recipient_id_idx")
      .on(table.recipientId)
      .where(sql`${table.readAt} is null`),
  ],
)

export type NotificationRow = typeof notifications.$inferSelect
export type NotificationTypeValue = (typeof notificationType.enumValues)[number]
