import type { Page, PostView, PublicProfile } from "@ponto/types"
import { postPageSchema, profilePageSchema, type SearchQuery } from "@ponto/validation"

import { withQuery, type HttpClient } from "../http.js"

export interface SearchResource {
  users(query: SearchQuery): Promise<Page<PublicProfile>>
  posts(query: SearchQuery): Promise<Page<PostView>>
}

export function createSearchResource(request: HttpClient): SearchResource {
  return {
    users: (query) =>
      request({
        method: "GET",
        path: withQuery({ path: "/search/users", query }),
        schema: profilePageSchema,
      }),
    posts: (query) =>
      request({
        method: "GET",
        path: withQuery({ path: "/search/posts", query }),
        schema: postPageSchema,
      }),
  }
}
