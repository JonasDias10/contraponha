import { ReactionTargetType, type ReactionKind, type ViewerReactionsResponse } from "@ponto/types"
import { viewerReactionsResponseSchema } from "@ponto/validation"

import { emptyResponseSchema, withQuery, type HttpClient } from "../http.js"

export interface ReactionRequest {
  targetType: ReactionTargetType
  targetId: string
  kind: ReactionKind
}

export interface ListMyReactionsRequest {
  targetType: ReactionTargetType
  targetIds: readonly string[]
}

export interface ReactionsResource {
  add(request: ReactionRequest): Promise<void>
  remove(request: ReactionRequest): Promise<void>
  listMine(request: ListMyReactionsRequest): Promise<ViewerReactionsResponse>
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
    listMine: ({ targetType, targetIds }) =>
      request({
        method: "GET",
        path: withQuery({
          path: "/reactions/mine",
          query: { targetType, targetIds: targetIds.join(",") },
        }),
        schema: viewerReactionsResponseSchema,
      }),
  }
}
