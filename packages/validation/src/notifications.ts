import { NotificationType, type NotificationView, type UnreadNotificationCount } from "@ponto/types"
import { z } from "zod"

import { pageSchema } from "./pagination.js"
import { publicProfileSchema } from "./users.js"

export const notificationViewSchema = z.object({
  id: z.uuid(),
  type: z.enum(NotificationType),
  actor: publicProfileSchema.nullable(),
  postId: z.uuid().nullable(),
  commentId: z.uuid().nullable(),
  isRead: z.boolean(),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<NotificationView>

export const notificationPageSchema = pageSchema(notificationViewSchema)

export const unreadNotificationCountSchema = z.object({
  count: z.number().int().nonnegative(),
}) satisfies z.ZodType<UnreadNotificationCount>
