import { COMMENT_BODY_MAX_LENGTH } from "@ponto/config"
import type { CommentView } from "@ponto/types"
import { z } from "zod"

import { pageSchema } from "./pagination.js"
import { contentRemovalSchema } from "./posts.js"
import { reactionCountsSchema } from "./reactions.js"
import { publicProfileSchema } from "./users.js"

export const commentBodySchema = z.string().trim().min(1).max(COMMENT_BODY_MAX_LENGTH)

export const createCommentInputSchema = z.object({
  body: commentBodySchema,
  parentId: z.uuid().optional(),
})

export const updateCommentInputSchema = z.object({
  body: commentBodySchema,
})

export type CreateCommentInput = z.input<typeof createCommentInputSchema>
export type UpdateCommentInput = z.input<typeof updateCommentInputSchema>

export const commentViewSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  parentId: z.uuid().nullable(),
  author: publicProfileSchema.nullable(),
  body: z.string().nullable(),
  isDeleted: z.boolean(),
  removedBy: contentRemovalSchema.nullable(),
  replyCount: z.number().int().nonnegative(),
  reactionCounts: reactionCountsSchema,
  createdAt: z.iso.datetime(),
  editedAt: z.iso.datetime().nullable(),
}) satisfies z.ZodType<CommentView>

export const commentPageSchema = pageSchema(commentViewSchema)
