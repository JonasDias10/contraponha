import {
  MEDIA_MAX_PER_POST,
  POST_BODY_MAX_LENGTH,
  POST_SOURCES_MAX,
  POST_TITLE_MAX_LENGTH,
} from "@contraponha/config"
import {
  ContentRemoval,
  type BookmarkCount,
  type ContentRevisionList,
  type PostSummary,
  type PostView,
  type QuotedPostView,
} from "@contraponha/types"
import { z } from "zod"

import {
  contentSourceSchema,
  editReasonSchema,
  replyPolicySchema,
  sourceListSchema,
  topicNameListSchema,
} from "./content.js"
import { mediaViewSchema } from "./media.js"
import { communityRuleSchema, contextNoteViewSchema } from "./moderation.js"
import { pageSchema } from "./pagination.js"
import { reactionCountsSchema, reactionKindSchema } from "./reactions.js"
import { topicSummarySchema } from "./topics.js"
import { publicProfileSchema } from "./users.js"

export const postBodySchema = z.string().trim().min(1).max(POST_BODY_MAX_LENGTH)

export const postTitleSchema = z
  .string()
  .trim()
  .max(POST_TITLE_MAX_LENGTH)
  .transform((title) => (title.length === 0 ? null : title))

export const contentRemovalSchema = z.enum(ContentRemoval)

const uniqueIds = z
  .array(z.uuid())
  .max(MEDIA_MAX_PER_POST)
  .refine((ids) => new Set(ids).size === ids.length, { message: "Media ids must be unique" })

export const createPostInputSchema = z.object({
  title: postTitleSchema.nullable().optional(),
  body: postBodySchema,
  sources: sourceListSchema(POST_SOURCES_MAX).optional(),
  topics: topicNameListSchema.optional(),
  replyPolicy: replyPolicySchema.optional(),
  mediaIds: uniqueIds.optional(),
  quotedPostId: z.uuid().optional(),
})

export const updatePostInputSchema = z.object({
  title: postTitleSchema.nullable().optional(),
  body: postBodySchema,
  sources: sourceListSchema(POST_SOURCES_MAX).optional(),
  replyPolicy: replyPolicySchema.optional(),
  reason: editReasonSchema.nullable().optional(),
})

export type CreatePostInput = z.input<typeof createPostInputSchema>
export type UpdatePostInput = z.input<typeof updatePostInputSchema>

export const quotedPostSchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  excerpt: z.string().nullable(),
  author: publicProfileSchema.nullable(),
  createdAt: z.iso.datetime(),
  isDeleted: z.boolean(),
}) satisfies z.ZodType<QuotedPostView>

export const postViewSchema = z.object({
  id: z.uuid(),
  author: publicProfileSchema.nullable(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  sources: z.array(contentSourceSchema),
  topics: z.array(topicSummarySchema),
  replyPolicy: replyPolicySchema,
  isPinned: z.boolean(),
  isDeleted: z.boolean(),
  removedBy: contentRemovalSchema.nullable(),
  removalRule: communityRuleSchema.nullable(),
  contextNote: contextNoteViewSchema.nullable(),
  media: z.array(mediaViewSchema),
  commentCount: z.number().int().nonnegative(),
  highlightedCommentCount: z.number().int().nonnegative(),
  repostCount: z.number().int().nonnegative(),
  quoteCount: z.number().int().nonnegative(),
  quotedPost: quotedPostSchema.nullable(),
  reactionCounts: reactionCountsSchema,
  createdAt: z.iso.datetime(),
  editedAt: z.iso.datetime().nullable(),
  revisionCount: z.number().int().nonnegative(),
  viewer: z
    .object({
      reactions: z.array(reactionKindSchema),
      isBookmarked: z.boolean(),
      canReply: z.boolean(),
      hasReposted: z.boolean(),
    })
    .nullable(),
}) satisfies z.ZodType<PostView>

export const postPageSchema = pageSchema(postViewSchema)

export const postSummarySchema = z.object({
  id: z.uuid(),
  title: z.string().nullable(),
  excerpt: z.string().nullable(),
  author: publicProfileSchema.nullable(),
}) satisfies z.ZodType<PostSummary>

export const contentRevisionListSchema = z.object({
  revisions: z.array(
    z.object({
      id: z.uuid(),
      title: z.string().nullable(),
      body: z.string(),
      sources: z.array(contentSourceSchema),
      reason: z.string().nullable(),
      createdAt: z.iso.datetime(),
    }),
  ),
}) satisfies z.ZodType<ContentRevisionList>

export const bookmarkCountSchema = z.object({
  count: z.number().int().nonnegative(),
}) satisfies z.ZodType<BookmarkCount>
