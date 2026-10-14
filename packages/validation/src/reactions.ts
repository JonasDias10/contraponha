import { ReactionKind, type ReactionCounts } from "@contraponha/types"
import { z } from "zod"

export const reactionKindSchema = z.enum(ReactionKind)

export const reactionCountsSchema = z.object({
  good_argument: z.number().int().nonnegative(),
  insightful: z.number().int().nonnegative(),
  changed_my_mind: z.number().int().nonnegative(),
  needs_source: z.number().int().nonnegative(),
}) satisfies z.ZodType<ReactionCounts>
