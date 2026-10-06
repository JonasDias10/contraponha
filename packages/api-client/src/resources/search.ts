import type {
  ContributionSearchResult,
  Page,
  PostSearchResult,
  PublicProfile,
  TopicList,
} from "@ponto/types"
import {
  contributionSearchPageSchema,
  postSearchPageSchema,
  profilePageSchema,
  topicListSchema,
  type ContentSearchQuery,
  type SearchQuery,
} from "@ponto/validation"

import { withQuery, type HttpClient } from "../http.js"

export interface SearchResource {
  users(query: SearchQuery): Promise<Page<PublicProfile>>
  posts(query: ContentSearchQuery): Promise<Page<PostSearchResult>>
  contributions(query: ContentSearchQuery): Promise<Page<ContributionSearchResult>>
  topics(query: SearchQuery): Promise<TopicList>
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
        schema: postSearchPageSchema,
      }),
    contributions: (query) =>
      request({
        method: "GET",
        path: withQuery({ path: "/search/contributions", query }),
        schema: contributionSearchPageSchema,
      }),
    topics: (query) =>
      request({
        method: "GET",
        path: withQuery({ path: "/search/topics", query }),
        schema: topicListSchema,
      }),
  }
}
