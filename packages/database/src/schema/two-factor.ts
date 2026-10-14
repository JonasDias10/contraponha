import { sql } from "drizzle-orm"
import { bigint, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { users } from "./users.js"

// TOTP for an account. The secret is stored encrypted (AES-256-GCM); a row without
// enabledAt is a setup in progress. lastUsedStep stops a code from being used twice.
export const twoFactorSecrets = pgTable("two_factor_secrets", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  secretCiphertext: text().notNull(),
  enabledAt: timestamp({ withTimezone: true }),
  lastUsedStep: bigint({ mode: "number" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

// One-time codes for when the authenticator is lost. Only hashes are stored.
export const twoFactorRecoveryCodes = pgTable(
  "two_factor_recovery_codes",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text().notNull(),
    usedAt: timestamp({ withTimezone: true }),
  },
  (table) => [index("two_factor_recovery_codes_user_id_idx").on(table.userId)],
)

export type TwoFactorSecretRow = typeof twoFactorSecrets.$inferSelect
export type TwoFactorRecoveryCodeRow = typeof twoFactorRecoveryCodes.$inferSelect
