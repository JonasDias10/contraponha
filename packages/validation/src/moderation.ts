import {
  CONTEXT_NOTE_MAX_LENGTH,
  MODERATION_NOTE_MAX_LENGTH,
  POST_SOURCES_MAX,
  REPORT_DETAILS_MAX_LENGTH,
} from "@ponto/config"
import {
  CommunityRule,
  ModerationActionType,
  ReportReason,
  ReportResolution,
  ReportStatus,
  ReportSubject,
  ReportTargetType,
  UserRole,
  type ContextNoteView,
  type ModerationActionView,
  type ReportView,
} from "@ponto/types"
import { z } from "zod"

import { contentSourceSchema, sourceListSchema } from "./content.js"
import { pageSchema, paginationQuerySchema } from "./pagination.js"
import { publicProfileSchema } from "./users.js"

const moderationNoteSchema = z.string().trim().min(1).max(MODERATION_NOTE_MAX_LENGTH)

export const communityRuleSchema = z.enum(CommunityRule)

export const createReportInputSchema = z.object({
  targetType: z.enum(ReportTargetType),
  targetId: z.uuid(),
  reason: z.enum(ReportReason),
  subject: z.enum(ReportSubject).optional(),
  details: z.string().trim().min(1).max(REPORT_DETAILS_MAX_LENGTH).optional(),
})

export const resolveReportInputSchema = z
  .object({
    resolution: z.enum(ReportResolution),
    rule: communityRuleSchema.optional(),
    note: moderationNoteSchema.optional(),
  })
  .refine((input) => input.resolution !== ReportResolution.REMOVE_CONTENT || input.rule, {
    message: "Removing content requires the rule that was applied",
    path: ["rule"],
  })

export const removeContentInputSchema = z.object({
  rule: communityRuleSchema,
  note: moderationNoteSchema.optional(),
})

export const changeRoleInputSchema = z.object({
  role: z.enum(UserRole),
})

export const contextNoteInputSchema = z.object({
  body: z.string().trim().min(1).max(CONTEXT_NOTE_MAX_LENGTH),
  sources: sourceListSchema(POST_SOURCES_MAX).optional(),
})

export const reportListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ReportStatus).default(ReportStatus.OPEN),
})

export type CreateReportInput = z.input<typeof createReportInputSchema>
export type ResolveReportInput = z.input<typeof resolveReportInputSchema>
export type RemoveContentInput = z.input<typeof removeContentInputSchema>
export type ChangeRoleInput = z.input<typeof changeRoleInputSchema>
export type ContextNoteInput = z.input<typeof contextNoteInputSchema>

export interface ReportListQuery {
  status?: ReportStatus
  cursor?: string
  limit?: number
}

export const contextNoteViewSchema = z.object({
  id: z.uuid(),
  body: z.string(),
  sources: z.array(contentSourceSchema),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<ContextNoteView>

export const reportViewSchema = z.object({
  id: z.uuid(),
  targetType: z.enum(ReportTargetType),
  targetId: z.uuid(),
  reason: z.enum(ReportReason),
  subject: z.enum(ReportSubject).nullable(),
  details: z.string().nullable(),
  excerpt: z.string().nullable(),
  targetAuthor: publicProfileSchema.nullable(),
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
  rule: communityRuleSchema.nullable(),
  note: z.string().nullable(),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<ModerationActionView>

export const moderationActionPageSchema = pageSchema(moderationActionViewSchema)
