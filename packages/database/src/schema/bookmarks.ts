import { index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core"

import { posts } from "./posts.js"
import { users } from "./users.js"

export const bookmarks = pgTable(
  "bookmarks",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
    index("bookmarks_user_id_created_at_idx").on(table.userId, table.createdAt),
  ],
)

export type BookmarkRow = typeof bookmarks.$inferSelect
