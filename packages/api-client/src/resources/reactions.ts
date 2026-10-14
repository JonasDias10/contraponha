import { ReactionTargetType, type ReactionKind } from "@contraponha/types"

import { emptyResponseSchema, type HttpClient } from "../http.js"

export interface ReactionRequest {
  targetType: ReactionTargetType
  targetId: string
  kind: ReactionKind
}

export interface ReactionsResource {
  add(request: ReactionRequest): Promise<void>
  remove(request: ReactionRequest): Promise<void>
}

function reactionPath({ targetType, targetId, kind }: ReactionRequest): string {
  const collection = targetType === ReactionTargetType.POST ? "posts" : "comments"
  return `/${collection}/${encodeURIComponent(targetId)}/reactions/${kind}`
}

export function createReactionsResource(request: HttpClient): ReactionsResource {
  return {
    add: async (reaction) => {
      await request({ method: "PUT", path: reactionPath(reaction), schema: emptyResponseSchema })
    },
    remove: async (reaction) => {
      await request({ method: "DELETE", path: reactionPath(reaction), schema: emptyResponseSchema })
    },
  }
}
