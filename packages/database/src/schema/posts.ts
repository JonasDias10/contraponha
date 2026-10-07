import { POST_BODY_MAX_LENGTH, POST_TITLE_MAX_LENGTH } from "@contraponha/config"
import { sql, type SQL } from "drizzle-orm"
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import {
  contentBodyCheck,
  contentColumns,
  reactionCountsCheck,
  removalMatchesStateCheck,
  tsvector,
  type ContentSourceValue,
} from "./content-columns.js"
import { users } from "./users.js"

export const replyPolicy = pgEnum("reply_policy", ["everyone", "following"])

export const posts = pgTable(
  "posts",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    authorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text(),
    replyPolicy: replyPolicy().notNull().default("everyone"),
    pinnedAt: timestamp({ withTimezone: true }),
    commentCount: integer().notNull().default(0),
    highlightedCommentCount: integer().notNull().default(0),
    ...contentColumns,
    searchVector: tsvector().generatedAlwaysAs(
      (): SQL =>
        sql`setweight(to_tsvector('portuguese', coalesce(${posts.title}, '')), 'A') || setweight(to_tsvector('portuguese', coalesce(${posts.body}, '')), 'B')`,
    ),
  },
  (table) => [
    index("posts_author_id_id_idx").on(table.authorId, table.id),
    index("posts_active_created_at_idx")
      .on(table.createdAt)
      .where(sql`${table.deletedAt} is null`),
    index("posts_search_vector_idx").using("gin", table.searchVector),
    uniqueIndex("posts_one_pinned_per_author")
      .on(table.authorId)
      .where(sql`${table.pinnedAt} is not null`),
    check(
      "posts_title_length",
      sql`${table.title} is null or char_length(${table.title}) between 1 and ${sql.raw(String(POST_TITLE_MAX_LENGTH))}`,
    ),
    check("posts_removal_matches_state", removalMatchesStateCheck(table)),
    check(
      "posts_body_matches_state",
      contentBodyCheck({
        body: table.body,
        deletedAt: table.deletedAt,
        maxLength: POST_BODY_MAX_LENGTH,
      }),
    ),
    check(
      "posts_counts_nonnegative",
      sql`${table.commentCount} >= 0 and ${table.highlightedCommentCount} >= 0`,
    ),
    check("posts_reaction_counts_nonnegative", reactionCountsCheck(table)),
  ],
)

export const postRevisions = pgTable(
  "post_revisions",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    title: text(),
    body: text().notNull(),
    sources: jsonb().$type<ContentSourceValue[]>().notNull().default([]),
    reason: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("post_revisions_post_id_idx").on(table.postId)],
)

export type PostRow = typeof posts.$inferSelect
export type PostRevisionRow = typeof postRevisions.$inferSelect
