import { sql } from "drizzle-orm"
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { users } from "./users.js"

export const passwordCredentials = pgTable("password_credentials", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  passwordHash: text().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const sessions = pgTable(
  "sessions",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text().notNull().unique("sessions_token_hash_unique"),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
)

export const verificationTokenPurpose = pgEnum("verification_token_purpose", [
  "email_verification",
  "password_reset",
  "magic_link",
])

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: verificationTokenPurpose().notNull(),
    tokenHash: text().notNull().unique("verification_tokens_token_hash_unique"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    consumedAt: timestamp({ withTimezone: true }),
  },
  (table) => [index("verification_tokens_user_purpose_idx").on(table.userId, table.purpose)],
)

export type SessionRow = typeof sessions.$inferSelect
export type VerificationTokenRow = typeof verificationTokens.$inferSelect
export type VerificationTokenPurpose = (typeof verificationTokenPurpose.enumValues)[number]
