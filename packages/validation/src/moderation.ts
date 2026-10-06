import { MODERATION_NOTE_MAX_LENGTH, REPORT_DETAILS_MAX_LENGTH } from "@ponto/config"
import {
  ModerationActionType,
  ReportReason,
  ReportResolution,
  ReportStatus,
  ReportTargetType,
  UserRole,
  type ModerationActionView,
  type ReportView,
} from "@ponto/types"
import { z } from "zod"

import { pageSchema, paginationQuerySchema } from "./pagination.js"
import { publicProfileSchema } from "./users.js"

const moderationNoteSchema = z.string().trim().min(1).max(MODERATION_NOTE_MAX_LENGTH)

export const createReportInputSchema = z.object({
  targetType: z.enum(ReportTargetType),
  targetId: z.uuid(),
  reason: z.enum(ReportReason),
  details: z.string().trim().min(1).max(REPORT_DETAILS_MAX_LENGTH).optional(),
})

export const resolveReportInputSchema = z.object({
  resolution: z.enum(ReportResolution),
  note: moderationNoteSchema.optional(),
})

export const removeContentInputSchema = z.object({
  note: moderationNoteSchema.optional(),
})

export const changeRoleInputSchema = z.object({
  role: z.enum(UserRole),
})

export const reportListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ReportStatus).default(ReportStatus.OPEN),
})

export type CreateReportInput = z.input<typeof createReportInputSchema>
export type ResolveReportInput = z.input<typeof resolveReportInputSchema>
export type RemoveContentInput = z.input<typeof removeContentInputSchema>
export type ChangeRoleInput = z.input<typeof changeRoleInputSchema>

export interface ReportListQuery {
  status?: ReportStatus
  cursor?: string
  limit?: number
}

export const reportViewSchema = z.object({
  id: z.uuid(),
  targetType: z.enum(ReportTargetType),
  targetId: z.uuid(),
  reason: z.enum(ReportReason),
  details: z.string().nullable(),
  status: z.enum(ReportStatus),
  reporter: publicProfileSchema.nullable(),
  createdAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().nullable(),
}) satisfies z.ZodType<ReportView>

export const reportPageSchema = pageSchema(reportViewSchema)

export const moderationActionViewSchema = z.object({
  id: z.uuid(),
  type: z.enum(ModerationActionType),
  moderator: publicProfileSchema.nullable(),
  reportId: z.uuid().nullable(),
  postId: z.uuid().nullable(),
  commentId: z.uuid().nullable(),
  targetUserId: z.uuid().nullable(),
  note: z.string().nullable(),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<ModerationActionView>

export const moderationActionPageSchema = pageSchema(moderationActionViewSchema)
