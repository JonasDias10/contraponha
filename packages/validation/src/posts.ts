import { MEDIA_MAX_PER_POST, POST_BODY_MAX_LENGTH } from "@ponto/config"
import { ContentRemoval, type ContentRevisionList, type PostView } from "@ponto/types"
import { z } from "zod"

import { mediaViewSchema } from "./media.js"
import { pageSchema } from "./pagination.js"
import { reactionCountsSchema } from "./reactions.js"
import { publicProfileSchema } from "./users.js"

export const postBodySchema = z.string().trim().min(1).max(POST_BODY_MAX_LENGTH)

export const contentRemovalSchema = z.enum(ContentRemoval)

export const createPostInputSchema = z.object({
  body: postBodySchema,
  mediaIds: z
    .array(z.uuid())
    .max(MEDIA_MAX_PER_POST)
    .refine((ids) => new Set(ids).size === ids.length, { message: "Media ids must be unique" })
    .optional(),
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
  removedBy: contentRemovalSchema.nullable(),
  media: z.array(mediaViewSchema),
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
