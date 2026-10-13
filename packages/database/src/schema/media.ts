import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core"

import { posts } from "./posts.js"
import { users } from "./users.js"

export interface MediaVariantValue {
  key: string
  width: number
  height: number
}

export const mediaStatus = pgEnum("media_status", ["pending", "attached", "profile"])

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    ownerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid().references(() => posts.id, { onDelete: "cascade" }),
    position: smallint(),
    storageKey: text().notNull().unique("media_assets_storage_key_unique"),
    mimeType: text().notNull(),
    sizeBytes: integer().notNull(),
    status: mediaStatus().notNull().default("pending"),
    // Filled when a post image is processed: the original's oriented size and the WebP
    // variants served instead of it (the original, with its EXIF data, is deleted).
    width: integer(),
    height: integer(),
    variants: jsonb().$type<MediaVariantValue[]>(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    attachedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("media_assets_post_id_position_idx").on(table.postId, table.position),
    index("media_assets_owner_id_status_idx").on(table.ownerId, table.status),
    check(
      "media_assets_attachment_matches_status",
      sql`(${table.status} = 'attached') = (${table.postId} is not null and ${table.position} is not null)`,
    ),
    check("media_assets_size_positive", sql`${table.sizeBytes} > 0`),
  ],
)

export type MediaAssetRow = typeof mediaAssets.$inferSelect
