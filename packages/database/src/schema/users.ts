import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

export const userRole = pgEnum("user_role", ["member", "moderator", "admin"])

export const verificationCategory = pgEnum("verification_category", [
  "public_figure",
  "journalist",
  "expert",
  "institution",
])

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
    headline: text(),
    location: text(),
    website: text(),
    pronouns: text(),
    avatarUrl: text(),
    birthDate: date(),
    locale: text().notNull().default("pt-BR"),
    timezone: text().notNull().default("America/Sao_Paulo"),
    onboardedAt: timestamp({ withTimezone: true }),
    // Mirrors two_factor_secrets.enabled_at so profiles and role checks need no join.
    twoFactorEnabledAt: timestamp({ withTimezone: true }),
    role: userRole().notNull().default("member"),
    // Granted by an admin after checking who the person is; unrelated to email confirmation.
    verificationCategory: verificationCategory(),
    verifiedAt: timestamp({ withTimezone: true }),
    followerCount: integer().notNull().default(0),
    followingCount: integer().notNull().default(0),
    postCount: integer().notNull().default(0),
    deletionScheduledAt: timestamp({ withTimezone: true }),
    deleteContributions: boolean().notNull().default(false),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("users_email_lowercase", sql`${table.email} = lower(${table.email})`),
    index("users_handle_trgm_idx").using("gin", table.handle.op("gin_trgm_ops")),
    index("users_display_name_trgm_idx").using("gin", table.displayName.op("gin_trgm_ops")),
    check("users_handle_format", sql`${table.handle} ~ '^[a-z0-9_]{3,30}$'`),
    check(
      "users_follow_counts_nonnegative",
      sql`${table.followerCount} >= 0 and ${table.followingCount} >= 0 and ${table.postCount} >= 0`,
    ),
    check(
      "users_verification_complete",
      sql`(${table.verificationCategory} is null) = (${table.verifiedAt} is null)`,
    ),
    index("users_deletion_scheduled_at_idx")
      .on(table.deletionScheduledAt)
      .where(sql`${table.deletionScheduledAt} is not null and ${table.deletedAt} is null`),
  ],
)

export type UserRow = typeof users.$inferSelect
export type NewUserRow = typeof users.$inferInsert
