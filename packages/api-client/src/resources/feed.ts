import type { DiscussionList, FeedItem, Page } from "@ponto/types"
import { discussionListSchema, feedPageSchema, type PaginationQuery } from "@ponto/validation"

import { withQuery, type HttpClient } from "../http.js"

export interface TopicFeedRequest {
  slug: string
  query?: PaginationQuery
}

export interface FeedResource {
  following(query?: PaginationQuery): Promise<Page<FeedItem>>
  discover(query?: PaginationQuery): Promise<Page<FeedItem>>
  topic(request: TopicFeedRequest): Promise<Page<FeedItem>>
  discussions(): Promise<DiscussionList>
}

export function createFeedResource(request: HttpClient): FeedResource {
  return {
    following: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/feed/following", query }),
        schema: feedPageSchema,
      }),
    discover: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/feed/discover", query }),
        schema: feedPageSchema,
      }),
    topic: ({ slug, query = {} }) =>
      request({
        method: "GET",
        path: withQuery({ path: `/feed/topics/${encodeURIComponent(slug)}`, query }),
        schema: feedPageSchema,
      }),
    discussions: () =>
      request({ method: "GET", path: "/feed/discussions", schema: discussionListSchema }),
  }
}
