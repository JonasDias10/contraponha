import {
  NotificationFilter,
  NotificationType,
  type NotificationPreferences,
  type NotificationView,
  type UnreadNotificationCount,
} from "@contraponha/types"
import { z } from "zod"

import { communityRuleSchema } from "./moderation.js"
import { pageSchema, paginationQuerySchema } from "./pagination.js"
import { postSummarySchema } from "./posts.js"
import { publicProfileSchema } from "./users.js"

export const DIGEST_HOURS_MAX = 4

export const notificationViewSchema = z.object({
  id: z.uuid(),
  type: z.enum(NotificationType),
  actors: z.array(publicProfileSchema),
  actorCount: z.number().int().nonnegative(),
  post: postSummarySchema.nullable(),
  commentId: z.uuid().nullable(),
  commentExcerpt: z.string().nullable(),
  moderation: z
    .object({ rule: communityRuleSchema.nullable(), wasRemoved: z.boolean() })
    .nullable(),
  isRead: z.boolean(),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<NotificationView>

export const notificationPageSchema = pageSchema(notificationViewSchema)

export const notificationListQuerySchema = paginationQuerySchema.extend({
  filter: z.enum(NotificationFilter).default(NotificationFilter.ALL),
})

export interface NotificationListQuery {
  filter?: NotificationFilter
  cursor?: string
  limit?: number
}

export const unreadNotificationCountSchema = z.object({
  count: z.number().int().nonnegative(),
}) satisfies z.ZodType<UnreadNotificationCount>

export const digestHoursSchema = z
  .array(z.number().int().min(0).max(23))
  .max(DIGEST_HOURS_MAX)
  .transform((hours) => [...new Set(hours)].toSorted((a, b) => a - b))

export const notificationPreferencesSchema = z.object({
  replies: z.boolean(),
  mentions: z.boolean(),
  highlights: z.boolean(),
  sourceRequests: z.boolean(),
  reactions: z.boolean(),
  follows: z.boolean(),
  digestHours: z.array(z.number().int().min(0).max(23)),
}) satisfies z.ZodType<NotificationPreferences>

export const updateNotificationPreferencesInputSchema = z
  .object({
    replies: z.boolean().optional(),
    mentions: z.boolean().optional(),
    highlights: z.boolean().optional(),
    sourceRequests: z.boolean().optional(),
    reactions: z.boolean().optional(),
    follows: z.boolean().optional(),
    digestHours: digestHoursSchema.optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  })

export type UpdateNotificationPreferencesInput = z.input<
  typeof updateNotificationPreferencesInputSchema
>
