import { ReactionKind } from "@ponto/types"

const EXCLUSIVE_COUNTERPARTS: Partial<Record<ReactionKind, ReactionKind>> = {
  [ReactionKind.AGREE]: ReactionKind.DISAGREE,
  [ReactionKind.DISAGREE]: ReactionKind.AGREE,
}

export function exclusiveCounterpart(kind: ReactionKind): ReactionKind | undefined {
  return EXCLUSIVE_COUNTERPARTS[kind]
}
