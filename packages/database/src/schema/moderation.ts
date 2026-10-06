import { sql } from "drizzle-orm"
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { comments } from "./comments.js"
import { posts } from "./posts.js"
import { users } from "./users.js"

export const reportTargetType = pgEnum("report_target_type", ["post", "comment", "user"])

export const reportReason = pgEnum("report_reason", [
  "spam",
  "harassment",
  "hate",
  "misinformation",
  "violence",
  "sexual_content",
  "other",
])

export const reportStatus = pgEnum("report_status", ["open", "resolved", "dismissed"])

export const moderationActionType = pgEnum("moderation_action_type", [
  "content_removed",
  "report_resolved",
  "report_dismissed",
  "role_changed",
])

export const reports = pgTable(
  "reports",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    reporterId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: reportTargetType().notNull(),
    postId: uuid().references(() => posts.id, { onDelete: "cascade" }),
    commentId: uuid().references(() => comments.id, { onDelete: "cascade" }),
    targetUserId: uuid().references(() => users.id, { onDelete: "cascade" }),
    reason: reportReason().notNull(),
    details: text(),
    status: reportStatus().notNull().default("open"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp({ withTimezone: true }),
    resolvedById: uuid().references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    check(
      "reports_target_matches_type",
      sql`num_nonnulls(${table.postId}, ${table.commentId}, ${table.targetUserId}) = 1
        and (${table.targetType} <> 'post' or ${table.postId} is not null)
        and (${table.targetType} <> 'comment' or ${table.commentId} is not null)
        and (${table.targetType} <> 'user' or ${table.targetUserId} is not null)`,
    ),
    check(
      "reports_resolution_matches_status",
      sql`(${table.status} = 'open') = (${table.resolvedAt} is null)`,
    ),
    index("reports_status_id_idx").on(table.status, table.id),
    uniqueIndex("reports_open_post_unique")
      .on(table.reporterId, table.postId)
      .where(sql`${table.status} = 'open' and ${table.postId} is not null`),
    uniqueIndex("reports_open_comment_unique")
      .on(table.reporterId, table.commentId)
      .where(sql`${table.status} = 'open' and ${table.commentId} is not null`),
    uniqueIndex("reports_open_user_unique")
      .on(table.reporterId, table.targetUserId)
      .where(sql`${table.status} = 'open' and ${table.targetUserId} is not null`),
  ],
)

// Audit trail of moderator actions. Rows are only ever inserted; references are nulled
// rather than deleted when the related records go away, so the history survives.
export const moderationActions = pgTable("moderation_actions", {
  id: uuid()
    .primaryKey()
    .default(sql`uuidv7()`),
  moderatorId: uuid().references(() => users.id, { onDelete: "set null" }),
  type: moderationActionType().notNull(),
  reportId: uuid().references(() => reports.id, { onDelete: "set null" }),
  postId: uuid().references(() => posts.id, { onDelete: "set null" }),
  commentId: uuid().references(() => comments.id, { onDelete: "set null" }),
  targetUserId: uuid().references(() => users.id, { onDelete: "set null" }),
  note: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export type ReportRow = typeof reports.$inferSelect
export type ModerationActionRow = typeof moderationActions.$inferSelect
