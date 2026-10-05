import type { FollowStatus, Page, PublicProfile } from "@ponto/types"
import { followStatusSchema, profilePageSchema, type PaginationQuery } from "@ponto/validation"

import { emptyResponseSchema, withQuery, type HttpClient } from "../http.js"

export interface ListConnectionsRequest {
  handle: string
  query?: PaginationQuery
}

export interface FollowsResource {
  follow(handle: string): Promise<void>
  unfollow(handle: string): Promise<void>
  getStatus(handle: string): Promise<FollowStatus>
  listFollowers(request: ListConnectionsRequest): Promise<Page<PublicProfile>>
  listFollowing(request: ListConnectionsRequest): Promise<Page<PublicProfile>>
}

function userPath(handle: string): string {
  return `/users/${encodeURIComponent(handle)}`
}

export function createFollowsResource(request: HttpClient): FollowsResource {
  return {
    follow: async (handle) => {
      await request({
        method: "PUT",
        path: `${userPath(handle)}/follow`,
        schema: emptyResponseSchema,
      })
    },
    unfollow: async (handle) => {
      await request({
        method: "DELETE",
        path: `${userPath(handle)}/follow`,
        schema: emptyResponseSchema,
      })
    },
    getStatus: (handle) =>
      request({ method: "GET", path: `${userPath(handle)}/follow`, schema: followStatusSchema }),
    listFollowers: ({ handle, query = {} }) =>
      request({
        method: "GET",
        path: withQuery({ path: `${userPath(handle)}/followers`, query }),
        schema: profilePageSchema,
      }),
    listFollowing: ({ handle, query = {} }) =>
      request({
        method: "GET",
        path: withQuery({ path: `${userPath(handle)}/following`, query }),
        schema: profilePageSchema,
      }),
  }
}
