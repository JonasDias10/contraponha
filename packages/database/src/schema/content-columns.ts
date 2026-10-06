import { sql, type SQL } from "drizzle-orm"
import {
  customType,
  integer,
  jsonb,
  pgEnum,
  text,
  timestamp,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"

export const REACTION_KINDS = [
  "good_argument",
  "insightful",
  "changed_my_mind",
  "needs_source",
] as const

export type ReactionKindValue = (typeof REACTION_KINDS)[number]

export const REACTION_COUNT_FIELDS = {
  good_argument: "goodArgumentCount",
  insightful: "insightfulCount",
  changed_my_mind: "changedMyMindCount",
  needs_source: "needsSourceCount",
} as const satisfies Record<ReactionKindValue, string>

export type ReactionCountField = (typeof REACTION_COUNT_FIELDS)[ReactionKindValue]

export type ReactionCountValues = Record<ReactionCountField, number>

export function readReactionCounts(row: ReactionCountValues): Record<ReactionKindValue, number> {
  return {
    good_argument: row.goodArgumentCount,
    insightful: row.insightfulCount,
    changed_my_mind: row.changedMyMindCount,
    needs_source: row.needsSourceCount,
  }
}

export const COMMUNITY_RULES = [
  "personal_attack",
  "harassment",
  "hate_speech",
  "misinformation",
  "spam",
  "violence",
  "sexual_content",
  "privacy",
  "illegal_content",
  "impersonation",
] as const

export type CommunityRuleValue = (typeof COMMUNITY_RULES)[number]

export const contentRemoval = pgEnum("content_removal", ["author", "moderation"])

export interface ContentSourceValue {
  url: string
  title: string | null
}

export const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
})

export const contentColumns = {
  body: text(),
  goodArgumentCount: integer().notNull().default(0),
  insightfulCount: integer().notNull().default(0),
  changedMyMindCount: integer().notNull().default(0),
  needsSourceCount: integer().notNull().default(0),
  sources: jsonb().$type<ContentSourceValue[]>().notNull().default([]),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp({ withTimezone: true }),
  deletedAt: timestamp({ withTimezone: true }),
  removedBy: contentRemoval(),
  removalRule: text().$type<CommunityRuleValue>(),
}

export interface RemovalCheckParams {
  deletedAt: AnyPgColumn
  removedBy: AnyPgColumn
}

export function removalMatchesStateCheck({ deletedAt, removedBy }: RemovalCheckParams): SQL {
  return sql`(${deletedAt} is null) = (${removedBy} is null)`
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
  changedMyMindCount: AnyPgColumn
  needsSourceCount: AnyPgColumn
}

export function reactionCountsCheck(columns: ReactionCountColumns): SQL {
  return sql`${columns.goodArgumentCount} >= 0 and ${columns.insightfulCount} >= 0 and ${columns.changedMyMindCount} >= 0 and ${columns.needsSourceCount} >= 0`
}
