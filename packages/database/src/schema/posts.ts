import { POST_BODY_MAX_LENGTH } from "@ponto/config"
import { sql, type SQL } from "drizzle-orm"
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import {
  contentBodyCheck,
  contentColumns,
  reactionCountsCheck,
  removalMatchesStateCheck,
  tsvector,
} from "./content-columns.js"
import { users } from "./users.js"

export const posts = pgTable(
  "posts",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    authorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    commentCount: integer().notNull().default(0),
    ...contentColumns,
    searchVector: tsvector().generatedAlwaysAs(
      (): SQL => sql`to_tsvector('portuguese', coalesce(${posts.body}, ''))`,
    ),
  },
  (table) => [
    index("posts_author_id_id_idx").on(table.authorId, table.id),
    index("posts_active_created_at_idx")
      .on(table.createdAt)
      .where(sql`${table.deletedAt} is null`),
    index("posts_search_vector_idx").using("gin", table.searchVector),
    check("posts_removal_matches_state", removalMatchesStateCheck(table)),
    check(
      "posts_body_matches_state",
      contentBodyCheck({
        body: table.body,
        deletedAt: table.deletedAt,
        maxLength: POST_BODY_MAX_LENGTH,
      }),
    ),
    check("posts_counts_nonnegative", sql`${table.commentCount} >= 0`),
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
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("post_revisions_post_id_idx").on(table.postId)],
)

export type PostRow = typeof posts.$inferSelect
export type PostRevisionRow = typeof postRevisions.$inferSelect
