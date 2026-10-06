import { sql, type SQL } from "drizzle-orm"
import { integer, text, timestamp, type AnyPgColumn } from "drizzle-orm/pg-core"

export const REACTION_KINDS = ["good_argument", "insightful", "agree", "disagree"] as const

export type ReactionKindValue = (typeof REACTION_KINDS)[number]

export const REACTION_COUNT_FIELDS = {
  good_argument: "goodArgumentCount",
  insightful: "insightfulCount",
  agree: "agreeCount",
  disagree: "disagreeCount",
} as const satisfies Record<ReactionKindValue, string>

export type ReactionCountField = (typeof REACTION_COUNT_FIELDS)[ReactionKindValue]

export type ReactionCountValues = Record<ReactionCountField, number>

export function readReactionCounts(row: ReactionCountValues): Record<ReactionKindValue, number> {
  return {
    good_argument: row.goodArgumentCount,
    insightful: row.insightfulCount,
    agree: row.agreeCount,
    disagree: row.disagreeCount,
  }
}

export const contentColumns = {
  body: text(),
  goodArgumentCount: integer().notNull().default(0),
  insightfulCount: integer().notNull().default(0),
  agreeCount: integer().notNull().default(0),
  disagreeCount: integer().notNull().default(0),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp({ withTimezone: true }),
  deletedAt: timestamp({ withTimezone: true }),
}

export interface ContentBodyCheckParams {
  body: AnyPgColumn
  deletedAt: AnyPgColumn
  maxLength: number
}

export function contentBodyCheck({ body, deletedAt, maxLength }: ContentBodyCheckParams): SQL {
  return sql`(${deletedAt} is null and char_length(${body}) between 1 and ${sql.raw(String(maxLength))}) or (${deletedAt} is not null and ${body} is null)`
}

export interface ReactionCountColumns {
  goodArgumentCount: AnyPgColumn
  insightfulCount: AnyPgColumn
  agreeCount: AnyPgColumn
  disagreeCount: AnyPgColumn
}

export function reactionCountsCheck(columns: ReactionCountColumns): SQL {
  return sql`${columns.goodArgumentCount} >= 0 and ${columns.insightfulCount} >= 0 and ${columns.agreeCount} >= 0 and ${columns.disagreeCount} >= 0`
}
