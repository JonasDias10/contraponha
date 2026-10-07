import { ReactionKind } from "@contraponha/types"

export const REACTION_ORDER = [
  ReactionKind.GOOD_ARGUMENT,
  ReactionKind.INSIGHTFUL,
  ReactionKind.CHANGED_MY_MIND,
  ReactionKind.NEEDS_SOURCE,
] as const
