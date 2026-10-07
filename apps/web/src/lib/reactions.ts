import { ReactionKind } from "@contraponha/types"
import { BookText, CircleCheck, Lightbulb, RefreshCw, type LucideIcon } from "lucide-react"

export const REACTION_ICONS: Record<ReactionKind, LucideIcon> = {
  [ReactionKind.GOOD_ARGUMENT]: CircleCheck,
  [ReactionKind.INSIGHTFUL]: Lightbulb,
  [ReactionKind.CHANGED_MY_MIND]: RefreshCw,
  [ReactionKind.NEEDS_SOURCE]: BookText,
}
