import { sql } from "drizzle-orm"
import { check, index, pgEnum, pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"

import { comments } from "./comments.js"
import { REACTION_KINDS } from "./content-columns.js"
import { posts } from "./posts.js"
import { users } from "./users.js"

export const reactionKind = pgEnum("reaction_kind", REACTION_KINDS)

export const reactions = pgTable(
  "reactions",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid().references(() => posts.id, { onDelete: "cascade" }),
    commentId: uuid().references(() => comments.id, { onDelete: "cascade" }),
    kind: reactionKind().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("reactions_single_target", sql`num_nonnulls(${table.postId}, ${table.commentId}) = 1`),
    uniqueIndex("reactions_post_user_kind_unique")
      .on(table.postId, table.userId, table.kind)
      .where(sql`${table.postId} is not null`),
    uniqueIndex("reactions_comment_user_kind_unique")
      .on(table.commentId, table.userId, table.kind)
      .where(sql`${table.commentId} is not null`),
    index("reactions_user_id_idx").on(table.userId),
  ],
)

export type ReactionRow = typeof reactions.$inferSelect
