import {
  COMMENT_BODY_MAX_LENGTH,
  COMMENT_SOURCES_MAX,
  HIGHLIGHT_NOTE_MAX_LENGTH,
} from "@ponto/config"
import { CommentSort, type CommentView, type ContributionView } from "@ponto/types"
import { z } from "zod"

import { contentSourceSchema, editReasonSchema, sourceListSchema } from "./content.js"
import { communityRuleSchema } from "./moderation.js"
import { pageSchema, paginationQuerySchema } from "./pagination.js"
import { contentRemovalSchema, postSummarySchema } from "./posts.js"
import { reactionCountsSchema, reactionKindSchema } from "./reactions.js"
import { publicProfileSchema } from "./users.js"

export const commentBodySchema = z.string().trim().min(1).max(COMMENT_BODY_MAX_LENGTH)

export const createCommentInputSchema = z.object({
  body: commentBodySchema,
  parentId: z.uuid().optional(),
  sources: sourceListSchema(COMMENT_SOURCES_MAX).optional(),
})

export const updateCommentInputSchema = z.object({
  body: commentBodySchema,
  sources: sourceListSchema(COMMENT_SOURCES_MAX).optional(),
  reason: editReasonSchema.nullable().optional(),
})

export const highlightCommentInputSchema = z.object({
  note: z
    .string()
    .trim()
    .max(HIGHLIGHT_NOTE_MAX_LENGTH)
    .transform((note) => (note.length === 0 ? null : note))
    .nullable()
    .optional(),
})

export const commentListQuerySchema = paginationQuerySchema.extend({
  sort: z.enum(CommentSort).default(CommentSort.RELEVANT),
})

export interface CommentListQuery {
  sort?: CommentSort
  cursor?: string
  limit?: number
}

export type CreateCommentInput = z.input<typeof createCommentInputSchema>
export type UpdateCommentInput = z.input<typeof updateCommentInputSchema>
export type HighlightCommentInput = z.input<typeof highlightCommentInputSchema>

export const commentViewSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  parentId: z.uuid().nullable(),
  author: publicProfileSchema.nullable(),
  body: z.string().nullable(),
  sources: z.array(contentSourceSchema),
  isDeleted: z.boolean(),
  removedBy: contentRemovalSchema.nullable(),
  removalRule: communityRuleSchema.nullable(),
  highlight: z.object({ note: z.string().nullable(), highlightedAt: z.iso.datetime() }).nullable(),
  isByPostAuthor: z.boolean(),
  replyCount: z.number().int().nonnegative(),
  reactionCounts: reactionCountsSchema,
  createdAt: z.iso.datetime(),
  editedAt: z.iso.datetime().nullable(),
  viewer: z.object({ reactions: z.array(reactionKindSchema) }).nullable(),
}) satisfies z.ZodType<CommentView>

export const commentPageSchema = pageSchema(commentViewSchema)

export const contributionViewSchema = z.object({
  comment: commentViewSchema,
  post: postSummarySchema,
}) satisfies z.ZodType<ContributionView>

export const contributionPageSchema = pageSchema(contributionViewSchema)
