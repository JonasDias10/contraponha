import type { FollowedAmong, FollowStatus } from "@ponto/types"
import { z } from "zod"

import { pageSchema } from "./pagination.js"
import { publicProfileSchema } from "./users.js"

export const followStatusSchema = z.object({
  isFollowing: z.boolean(),
}) satisfies z.ZodType<FollowStatus>

export const FOLLOW_STATUS_MAX_USERS = 100

export const followedAmongQuerySchema = z.object({
  userIds: z
    .string()
    .transform((value) => value.split(",").map((id) => id.trim()))
    .pipe(z.array(z.uuid()).min(1).max(FOLLOW_STATUS_MAX_USERS)),
})

export type FollowedAmongQuery = z.input<typeof followedAmongQuerySchema>

export const followedAmongSchema = z.object({
  userIds: z.array(z.uuid()),
}) satisfies z.ZodType<FollowedAmong>

export const profilePageSchema = pageSchema(publicProfileSchema)
