import { sql } from "drizzle-orm"
import {
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import { comments } from "./comments.js"
import type { CommunityRuleValue, ContentSourceValue } from "./content-columns.js"
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
  "context_added",
  "context_removed",
  "user_suspended",
  "suspension_lifted",
  "avatar_removed",
  "topic_updated",
  "verification_granted",
  "verification_revoked",
])

export const reportSubject = pgEnum("report_subject", ["me", "someone_else", "group"])

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
    subject: reportSubject(),
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
  rule: text().$type<CommunityRuleValue>(),
  note: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

// Context shown above a post, written by moderators with sources. At most one is active.
export const contextNotes = pgTable(
  "context_notes",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid().references(() => users.id, { onDelete: "set null" }),
    body: text().notNull(),
    sources: jsonb().$type<ContentSourceValue[]>().notNull().default([]),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    removedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    uniqueIndex("context_notes_active_post_unique")
      .on(table.postId)
      .where(sql`${table.removedAt} is null`),
  ],
)

// A suspension ends sessions and blocks sign-in until endsAt; a null endsAt is a permanent
// ban. Lifting one early sets liftedAt. Each person has at most one row not yet lifted.
export const suspensions = pgTable(
  "suspensions",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moderatorId: uuid().references(() => users.id, { onDelete: "set null" }),
    rule: text().$type<CommunityRuleValue>().notNull(),
    note: text(),
    endsAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    liftedAt: timestamp({ withTimezone: true }),
    liftedById: uuid().references(() => users.id, { onDelete: "set null" }),
  },
  (table) => [
    uniqueIndex("suspensions_open_user_unique")
      .on(table.userId)
      .where(sql`${table.liftedAt} is null`),
    index("suspensions_user_id_created_at_idx").on(table.userId, table.createdAt),
    check(
      "suspensions_ends_after_start",
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.createdAt}`,
    ),
  ],
)

export type SuspensionRow = typeof suspensions.$inferSelect
export type ContextNoteRow = typeof contextNotes.$inferSelect
export type ReportRow = typeof reports.$inferSelect
export type ModerationActionRow = typeof moderationActions.$inferSelect
