import { RealtimeEventType, type RealtimeEvent } from "@contraponha/types"
import { z } from "zod"

export const realtimeEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(RealtimeEventType.NOTIFICATIONS_CHANGED),
    unreadCount: z.number().int().nonnegative(),
  }),
  z.object({ type: z.literal(RealtimeEventType.FEED_NEW_POST), postId: z.uuid() }),
  z.object({
    type: z.literal(RealtimeEventType.POST_NEW_COMMENT),
    postId: z.uuid(),
    commentId: z.uuid(),
    parentId: z.uuid().nullable(),
  }),
]) satisfies z.ZodType<RealtimeEvent>
