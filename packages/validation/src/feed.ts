import { FeedReasonType, type DiscussionList, type FeedItem } from "@ponto/types"
import { z } from "zod"

import { pageSchema } from "./pagination.js"
import { postViewSchema } from "./posts.js"
import { topicSummarySchema } from "./topics.js"

export const feedItemSchema = z.object({
  post: postViewSchema,
  reason: z
    .object({ type: z.enum(FeedReasonType), topic: topicSummarySchema.nullable() })
    .nullable(),
}) satisfies z.ZodType<FeedItem>

export const feedPageSchema = pageSchema(feedItemSchema)

export const discussionListSchema = z.object({
  discussions: z.array(
    z.object({
      postId: z.uuid(),
      title: z.string(),
      commentCount: z.number().int().nonnegative(),
      highlightedCommentCount: z.number().int().nonnegative(),
    }),
  ),
}) satisfies z.ZodType<DiscussionList>
