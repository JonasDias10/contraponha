import { sql } from "drizzle-orm"
import { check, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

export const USERS_EMAIL_UNIQUE = "users_email_unique"
export const USERS_HANDLE_UNIQUE = "users_handle_unique"

export const users = pgTable(
  "users",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    email: text().notNull().unique(USERS_EMAIL_UNIQUE),
    emailVerifiedAt: timestamp({ withTimezone: true }),
    handle: text().notNull().unique(USERS_HANDLE_UNIQUE),
    displayName: text().notNull(),
    bio: text(),
    locale: text().notNull().default("pt-BR"),
    followerCount: integer().notNull().default(0),
    followingCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("users_email_lowercase", sql`${table.email} = lower(${table.email})`),
    check("users_handle_format", sql`${table.handle} ~ '^[a-z0-9_]{3,30}$'`),
    check(
      "users_follow_counts_nonnegative",
      sql`${table.followerCount} >= 0 and ${table.followingCount} >= 0`,
    ),
  ],
)

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
