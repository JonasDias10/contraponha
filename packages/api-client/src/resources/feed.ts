import type { Page, PostView } from "@ponto/types"
import { postPageSchema, type PaginationQuery } from "@ponto/validation"

import { withQuery, type HttpClient } from "../http.js"

export interface FeedResource {
  following(query?: PaginationQuery): Promise<Page<PostView>>
  featured(query?: PaginationQuery): Promise<Page<PostView>>
}

export function createFeedResource(request: HttpClient): FeedResource {
  return {
    following: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/feed/following", query }),
        schema: postPageSchema,
      }),
    featured: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/feed/featured", query }),
        schema: postPageSchema,
      }),
  }
}
