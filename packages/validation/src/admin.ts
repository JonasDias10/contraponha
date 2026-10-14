import {
  AccountStatus,
  UserRole,
  type AdminMetrics,
  type AdminTopic,
  type AdminUserDetail,
  type AdminUserSummary,
  type SuspensionView,
} from "@contraponha/types"
import { z } from "zod"

import { communityRuleSchema } from "./moderation.js"
import { pageSchema, paginationQuerySchema } from "./pagination.js"
import { topicSlugSchema } from "./topics.js"
import { privateProfileSchema, publicProfileSchema, verificationCategorySchema } from "./users.js"

export const SUSPENSION_NOTE_MAX_LENGTH = 500
export const METRICS_DAYS_MAX = 90
export const VERIFICATION_NOTE_MAX_LENGTH = 500
export const TOPIC_NAME_MAX_LENGTH = 40

export const suspensionViewSchema = z.object({
  id: z.uuid(),
  rule: communityRuleSchema,
  note: z.string().nullable(),
  endsAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  liftedAt: z.iso.datetime().nullable(),
  moderator: publicProfileSchema.nullable(),
  isActive: z.boolean(),
}) satisfies z.ZodType<SuspensionView>

export const adminUserSummarySchema = z.object({
  user: privateProfileSchema,
  status: z.enum(AccountStatus),
  suspension: suspensionViewSchema.nullable(),
}) satisfies z.ZodType<AdminUserSummary>

export const adminUserPageSchema = pageSchema(adminUserSummarySchema)

export const adminUserDetailSchema = adminUserSummarySchema.extend({
  suspensions: z.array(suspensionViewSchema),
  reportsAgainst: z.number().int().nonnegative(),
  reportsFiled: z.number().int().nonnegative(),
  lastActiveAt: z.iso.datetime().nullable(),
}) satisfies z.ZodType<AdminUserDetail>

export const adminUserListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(100).optional(),
  role: z.enum(UserRole).optional(),
  status: z
    .enum([AccountStatus.ACTIVE, AccountStatus.SUSPENDED, AccountStatus.DELETION_SCHEDULED])
    .optional(),
})

export type AdminUserListQuery = z.input<typeof adminUserListQuerySchema>

export const suspendUserInputSchema = z.object({
  rule: communityRuleSchema,
  note: z.string().trim().max(SUSPENSION_NOTE_MAX_LENGTH).optional(),
  // Omitted or null bans the account until a moderator lifts it.
  endsAt: z.iso
    .datetime()
    .nullable()
    .optional()
    .refine((endsAt) => !endsAt || new Date(endsAt).getTime() > Date.now(), {
      message: "The suspension must end in the future",
    }),
})

export type SuspendUserInput = z.input<typeof suspendUserInputSchema>

export const adminMetricsQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(METRICS_DAYS_MAX).default(30),
})

export type AdminMetricsQuery = z.input<typeof adminMetricsQuerySchema>

export const adminMetricsSchema = z.object({
  totals: z.object({
    users: z.number().int().nonnegative(),
    activeUsers7d: z.number().int().nonnegative(),
    posts: z.number().int().nonnegative(),
    comments: z.number().int().nonnegative(),
    openReports: z.number().int().nonnegative(),
    activeSuspensions: z.number().int().nonnegative(),
  }),
  daily: z.array(
    z.object({
      date: z.iso.date(),
      signups: z.number().int().nonnegative(),
      posts: z.number().int().nonnegative(),
      comments: z.number().int().nonnegative(),
      reports: z.number().int().nonnegative(),
    }),
  ),
}) satisfies z.ZodType<AdminMetrics>

export const adminTopicSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  isCurated: z.boolean(),
  postCount: z.number().int().nonnegative(),
  followerCount: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<AdminTopic>

export const adminTopicPageSchema = pageSchema(adminTopicSchema)

export const adminTopicListQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(60).optional(),
  curated: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
})

export type AdminTopicListQuery = z.input<typeof adminTopicListQuerySchema>

const topicNameSchema = z.string().trim().min(2).max(TOPIC_NAME_MAX_LENGTH)

export const createTopicInputSchema = z.object({
  name: topicNameSchema,
  slug: topicSlugSchema,
  isCurated: z.boolean().default(true),
})

export type CreateTopicInput = z.input<typeof createTopicInputSchema>

export const updateTopicInputSchema = z
  .object({ name: topicNameSchema.optional(), isCurated: z.boolean().optional() })
  .refine(({ name, isCurated }) => name !== undefined || isCurated !== undefined, {
    message: "At least one field must be provided",
  })

export type UpdateTopicInput = z.input<typeof updateTopicInputSchema>

// The note says how the identity was checked; it goes to the audit log.
export const grantVerificationInputSchema = z.object({
  category: verificationCategorySchema,
  note: z.string().trim().min(1).max(VERIFICATION_NOTE_MAX_LENGTH),
})

export type GrantVerificationInput = z.input<typeof grantVerificationInputSchema>
