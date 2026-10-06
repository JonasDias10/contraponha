import {
  ReactionKind,
  ReactionTargetType,
  type ReactionCounts,
  type ViewerReactionsResponse,
} from "@ponto/types"
import { z } from "zod"

export const VIEWER_REACTIONS_MAX_TARGETS = 100

export const reactionKindSchema = z.enum(ReactionKind)

export const reactionCountsSchema = z.object({
  good_argument: z.number().int().nonnegative(),
  insightful: z.number().int().nonnegative(),
  agree: z.number().int().nonnegative(),
  disagree: z.number().int().nonnegative(),
}) satisfies z.ZodType<ReactionCounts>

export const viewerReactionsQuerySchema = z.object({
  targetType: z.enum(ReactionTargetType),
  targetIds: z
    .string()
    .transform((value) => value.split(",").map((id) => id.trim()))
    .pipe(z.array(z.uuid()).min(1).max(VIEWER_REACTIONS_MAX_TARGETS)),
})

export type ViewerReactionsQuery = z.input<typeof viewerReactionsQuerySchema>

export const viewerReactionsResponseSchema = z.object({
  reactions: z.array(
    z.object({
      targetId: z.uuid(),
      kinds: z.array(reactionKindSchema),
    }),
  ),
}) satisfies z.ZodType<ViewerReactionsResponse>
