import { sql } from "drizzle-orm"
import { check, index, pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core"

import { users } from "./users.js"

// Blocking works both ways: neither person sees or interacts with the other.
export const userBlocks = pgTable(
  "user_blocks",
  {
    blockerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    index("user_blocks_blocked_id_idx").on(table.blockedId),
    check("user_blocks_not_self", sql`${table.blockerId} <> ${table.blockedId}`),
  ],
)

// Muting only hides the muted person from the muter; the muted person is not told.
export const userMutes = pgTable(
  "user_mutes",
  {
    muterId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mutedId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.muterId, table.mutedId] }),
    check("user_mutes_not_self", sql`${table.muterId} <> ${table.mutedId}`),
  ],
)

export type UserBlockRow = typeof userBlocks.$inferSelect
export type UserMuteRow = typeof userMutes.$inferSelect
