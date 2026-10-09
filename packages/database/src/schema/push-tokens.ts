import { sql } from "drizzle-orm"
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { users } from "./users.js"

export const pushPlatform = pgEnum("push_platform", ["ios", "android"])

// One row per device. A token moves to whoever signs in on that device last.
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text().notNull().unique("push_tokens_token_unique"),
    platform: pushPlatform().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("push_tokens_user_id_idx").on(table.userId)],
)

export type PushTokenRow = typeof pushTokens.$inferSelect
