import type { TopicList, TopicView } from "@contraponha/types"
import { topicListSchema, topicViewSchema, type FollowTopicsInput } from "@contraponha/validation"

import { emptyResponseSchema, type HttpClient } from "../http.js"

export interface TopicsResource {
  listCurated(): Promise<TopicList>
  listFollowed(): Promise<TopicList>
  followMany(input: FollowTopicsInput): Promise<TopicList>
  get(slug: string): Promise<TopicView>
  follow(slug: string): Promise<void>
  unfollow(slug: string): Promise<void>
}

export function createTopicsResource(request: HttpClient): TopicsResource {
  const followPath = (slug: string): string => `/topics/${encodeURIComponent(slug)}/follow`

  return {
    listCurated: () => request({ method: "GET", path: "/topics", schema: topicListSchema }),
    listFollowed: () =>
      request({ method: "GET", path: "/topics/followed", schema: topicListSchema }),
    followMany: (input) =>
      request({ method: "PUT", path: "/topics/followed", body: input, schema: topicListSchema }),
    get: (slug) =>
      request({
        method: "GET",
        path: `/topics/${encodeURIComponent(slug)}`,
        schema: topicViewSchema,
      }),
    follow: async (slug) => {
      await request({ method: "PUT", path: followPath(slug), schema: emptyResponseSchema })
    },
    unfollow: async (slug) => {
      await request({ method: "DELETE", path: followPath(slug), schema: emptyResponseSchema })
    },
  }
}
