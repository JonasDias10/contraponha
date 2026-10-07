import type { TopicList, TopicSummary, TopicView } from "@ponto/types"
import { z } from "zod"

export const TOPIC_FOLLOWS_MAX_PER_REQUEST = 30

export const topicSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(60)

export const topicSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  isCurated: z.boolean(),
}) satisfies z.ZodType<TopicSummary>

export const topicViewSchema = topicSummarySchema.extend({
  postCount: z.number().int().nonnegative(),
  followerCount: z.number().int().nonnegative(),
  viewer: z.object({ isFollowing: z.boolean() }).nullable(),
}) satisfies z.ZodType<TopicView>

export const topicListSchema = z.object({
  topics: z.array(topicViewSchema),
}) satisfies z.ZodType<TopicList>

export const followTopicsInputSchema = z.object({
  slugs: z.array(topicSlugSchema).min(1).max(TOPIC_FOLLOWS_MAX_PER_REQUEST),
})

export type FollowTopicsInput = z.input<typeof followTopicsInputSchema>
