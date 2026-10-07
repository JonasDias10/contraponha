import {
  DataExportFormat,
  DataExportSection,
  DataExportStatus,
  type AccountDeletionStatus,
  type DataExportDownload,
  type DataExportList,
  type DataExportView,
} from "@ponto/types"
import { z } from "zod"

import { handleSchema } from "./users.js"

export const requestDataExportInputSchema = z.object({
  format: z.enum(DataExportFormat),
  sections: z
    .array(z.enum(DataExportSection))
    .min(1)
    .transform((sections) => [...new Set(sections)]),
})

export const scheduleAccountDeletionInputSchema = z.object({
  confirmHandle: handleSchema,
  deleteContributions: z.boolean().default(false),
})

export type RequestDataExportInput = z.input<typeof requestDataExportInputSchema>
export type ScheduleAccountDeletionInput = z.input<typeof scheduleAccountDeletionInputSchema>

export const dataExportViewSchema = z.object({
  id: z.uuid(),
  format: z.enum(DataExportFormat),
  sections: z.array(z.enum(DataExportSection)),
  status: z.enum(DataExportStatus),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
  expiresAt: z.iso.datetime().nullable(),
}) satisfies z.ZodType<DataExportView>

export const dataExportListSchema = z.object({
  exports: z.array(dataExportViewSchema),
}) satisfies z.ZodType<DataExportList>

export const dataExportDownloadSchema = z.object({
  url: z.url(),
  expiresAt: z.iso.datetime(),
}) satisfies z.ZodType<DataExportDownload>

export const accountDeletionStatusSchema = z.object({
  scheduledFor: z.iso.datetime().nullable(),
  deleteContributions: z.boolean(),
}) satisfies z.ZodType<AccountDeletionStatus>
