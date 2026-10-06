import type { FollowStatus } from "@ponto/types"
import { z } from "zod"

import { pageSchema } from "./pagination.js"
import { publicProfileSchema } from "./users.js"

export const followStatusSchema = z.object({
  isFollowing: z.boolean(),
}) satisfies z.ZodType<FollowStatus>

export const profilePageSchema = pageSchema(publicProfileSchema)
