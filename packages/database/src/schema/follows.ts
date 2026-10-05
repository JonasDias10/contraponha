import { sql } from "drizzle-orm"
import { check, index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core"

import { users } from "./users.js"

export const follows = pgTable(
  "follows",
  {
    followerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followeeId] }),
    index("follows_followee_id_created_at_idx").on(table.followeeId, table.createdAt),
    index("follows_follower_id_created_at_idx").on(table.followerId, table.createdAt),
    check("follows_not_self", sql`${table.followerId} <> ${table.followeeId}`),
  ],
)

export type FollowRow = typeof follows.$inferSelect
