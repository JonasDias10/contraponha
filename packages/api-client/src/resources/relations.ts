import type { Page, PublicProfile } from "@contraponha/types"
import { profilePageSchema, type PaginationQuery } from "@contraponha/validation"

import { emptyResponseSchema, withQuery, type HttpClient } from "../http.js"

export interface RelationsResource {
  block(handle: string): Promise<void>
  unblock(handle: string): Promise<void>
  mute(handle: string): Promise<void>
  unmute(handle: string): Promise<void>
  listBlocked(query?: PaginationQuery): Promise<Page<PublicProfile>>
  listMuted(query?: PaginationQuery): Promise<Page<PublicProfile>>
}

interface RelationRequestParams {
  method: "PUT" | "DELETE"
  handle: string
  relation: "block" | "mute"
}

export function createRelationsResource(request: HttpClient): RelationsResource {
  const send = async ({ method, handle, relation }: RelationRequestParams): Promise<void> => {
    await request({
      method,
      path: `/users/${encodeURIComponent(handle)}/${relation}`,
      schema: emptyResponseSchema,
    })
  }

  return {
    block: (handle) => send({ method: "PUT", handle, relation: "block" }),
    unblock: (handle) => send({ method: "DELETE", handle, relation: "block" }),
    mute: (handle) => send({ method: "PUT", handle, relation: "mute" }),
    unmute: (handle) => send({ method: "DELETE", handle, relation: "mute" }),
    listBlocked: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/me/blocks", query }),
        schema: profilePageSchema,
      }),
    listMuted: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/me/mutes", query }),
        schema: profilePageSchema,
      }),
  }
}
