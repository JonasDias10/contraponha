import { COMMENT_BODY_MAX_LENGTH } from "@ponto/config"
import { sql, type SQL } from "drizzle-orm"
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"

import {
  contentBodyCheck,
  contentColumns,
  reactionCountsCheck,
  removalMatchesStateCheck,
  tsvector,
  type ContentSourceValue,
} from "./content-columns.js"
import { posts } from "./posts.js"
import { users } from "./users.js"

export const comments = pgTable(
  "comments",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    parentId: uuid().references((): AnyPgColumn => comments.id, { onDelete: "cascade" }),
    authorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    replyCount: integer().notNull().default(0),
    highlightedAt: timestamp({ withTimezone: true }),
    highlightNote: text(),
    ...contentColumns,
    searchVector: tsvector().generatedAlwaysAs(
      (): SQL => sql`to_tsvector('portuguese', coalesce(${comments.body}, ''))`,
    ),
  },
  (table) => [
    index("comments_post_id_id_idx").on(table.postId, table.id),
    index("comments_parent_id_id_idx").on(table.parentId, table.id),
    index("comments_author_id_id_idx").on(table.authorId, table.id),
    index("comments_search_vector_idx").using("gin", table.searchVector),
    check(
      "comments_highlight_note_requires_highlight",
      sql`${table.highlightNote} is null or ${table.highlightedAt} is not null`,
    ),
    check("comments_removal_matches_state", removalMatchesStateCheck(table)),
    check(
      "comments_body_matches_state",
      contentBodyCheck({
        body: table.body,
        deletedAt: table.deletedAt,
        maxLength: COMMENT_BODY_MAX_LENGTH,
      }),
    ),
    check("comments_counts_nonnegative", sql`${table.replyCount} >= 0`),
    check("comments_reaction_counts_nonnegative", reactionCountsCheck(table)),
  ],
)

export const commentRevisions = pgTable(
  "comment_revisions",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    commentId: uuid()
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    body: text().notNull(),
    sources: jsonb().$type<ContentSourceValue[]>().notNull().default([]),
    reason: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("comment_revisions_comment_id_idx").on(table.commentId)],
)

export type CommentRow = typeof comments.$inferSelect
export type CommentRevisionRow = typeof commentRevisions.$inferSelect
