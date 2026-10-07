import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { posts } from "./posts.js"
import { users } from "./users.js"

export const TOPICS_SLUG_UNIQUE = "topics_slug_unique"

// Curated topics are the interests offered during onboarding; the rest are created from
// the hashtags people attach to posts.
export const topics = pgTable(
  "topics",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    slug: text().notNull().unique(TOPICS_SLUG_UNIQUE),
    name: text().notNull(),
    isCurated: boolean().notNull().default(false),
    postCount: integer().notNull().default(0),
    followerCount: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("topics_slug_format", sql`${table.slug} ~ '^[a-z0-9]+(-[a-z0-9]+)*$'`),
    check(
      "topics_counts_nonnegative",
      sql`${table.postCount} >= 0 and ${table.followerCount} >= 0`,
    ),
    index("topics_name_trgm_idx").using("gin", table.name.op("gin_trgm_ops")),
  ],
)

export const postTopics = pgTable(
  "post_topics",
  {
    postId: uuid()
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    topicId: uuid()
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    position: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.topicId] }),
    index("post_topics_topic_id_post_id_idx").on(table.topicId, table.postId),
  ],
)

export const topicFollows = pgTable(
  "topic_follows",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: uuid()
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.topicId] }),
    index("topic_follows_topic_id_idx").on(table.topicId),
  ],
)

export type TopicRow = typeof topics.$inferSelect
