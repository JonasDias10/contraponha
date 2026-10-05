import { POST_BODY_MAX_LENGTH } from "@ponto/config"
import type { ContentRevisionList, PostView } from "@ponto/types"
import { z } from "zod"

import { pageSchema } from "./pagination.js"
import { reactionCountsSchema } from "./reactions.js"
import { publicProfileSchema } from "./users.js"

export const postBodySchema = z.string().trim().min(1).max(POST_BODY_MAX_LENGTH)

export const createPostInputSchema = z.object({
  body: postBodySchema,
})

export const updatePostInputSchema = z.object({
  body: postBodySchema,
})

export type CreatePostInput = z.input<typeof createPostInputSchema>
export type UpdatePostInput = z.input<typeof updatePostInputSchema>

export const postViewSchema = z.object({
  id: z.uuid(),
  author: publicProfileSchema.nullable(),
  body: z.string().nullable(),
  isDeleted: z.boolean(),
  commentCount: z.number().int().nonnegative(),
  reactionCounts: reactionCountsSchema,
  createdAt: z.iso.datetime(),
  editedAt: z.iso.datetime().nullable(),
}) satisfies z.ZodType<PostView>

export const postPageSchema = pageSchema(postViewSchema)

export const contentRevisionListSchema = z.object({
  revisions: z.array(
    z.object({
      id: z.uuid(),
      body: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
}) satisfies z.ZodType<ContentRevisionList>
