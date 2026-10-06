import { sql } from "drizzle-orm"
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { users } from "./users.js"

export const legalDocument = pgEnum("legal_document", ["terms", "privacy", "guidelines"])

// One row per acceptance, so a new version of a document is accepted again without
// losing the record of what was accepted before (LGPD art. 8).
export const consents = pgTable(
  "consents",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    document: legalDocument().notNull(),
    version: text().notNull(),
    acceptedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("consents_user_id_idx").on(table.userId)],
)

export const DATA_EXPORT_SECTIONS = [
  "content",
  "reactions",
  "connections",
  "account",
  "recommendations",
  "reports",
] as const

export type DataExportSectionValue = (typeof DATA_EXPORT_SECTIONS)[number]

export const dataExportFormat = pgEnum("data_export_format", ["html", "json"])

export const dataExportStatus = pgEnum("data_export_status", [
  "pending",
  "processing",
  "ready",
  "failed",
])

export const dataExports = pgTable(
  "data_exports",
  {
    id: uuid()
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    format: dataExportFormat().notNull(),
    sections: text().array().$type<DataExportSectionValue[]>().notNull(),
    status: dataExportStatus().notNull().default("pending"),
    storageKey: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp({ withTimezone: true }),
    completedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("data_exports_user_id_id_idx").on(table.userId, table.id),
    index("data_exports_pending_idx")
      .on(table.createdAt)
      .where(sql`${table.status} = 'pending'`),
  ],
)

export type ConsentRow = typeof consents.$inferSelect
export type DataExportRow = typeof dataExports.$inferSelect
export type LegalDocumentValue = (typeof legalDocument.enumValues)[number]
