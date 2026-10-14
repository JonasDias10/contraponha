import { pgEnum, pgTable, integer, text, timestamp } from "drizzle-orm/pg-core"

export const linkPreviewStatus = pgEnum("link_preview_status", ["ready", "failed"])

// Open Graph data read from links in posts, shared by every post that links to the same
// URL. The image is a re-encoded copy in our storage, never a hotlink.
export const linkPreviews = pgTable("link_previews", {
  url: text().primaryKey(),
  status: linkPreviewStatus().notNull(),
  title: text(),
  description: text(),
  siteName: text(),
  imageKey: text(),
  imageWidth: integer(),
  imageHeight: integer(),
  fetchedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export type LinkPreviewRow = typeof linkPreviews.$inferSelect
