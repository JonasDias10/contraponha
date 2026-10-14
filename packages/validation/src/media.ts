import { AVATAR_MAX_BYTES, MEDIA_ALLOWED_TYPES, MEDIA_MAX_BYTES } from "@contraponha/config"
import { MediaPurpose, type MediaUploadTicket, type MediaView } from "@contraponha/types"
import { z } from "zod"

export const mediaMimeTypeSchema = z.enum(MEDIA_ALLOWED_TYPES)

export const createMediaUploadInputSchema = z
  .object({
    mimeType: mediaMimeTypeSchema,
    sizeBytes: z.number().int().min(1).max(MEDIA_MAX_BYTES),
    purpose: z.enum(MediaPurpose).default(MediaPurpose.POST),
  })
  .refine(
    ({ purpose, sizeBytes }) => purpose !== MediaPurpose.AVATAR || sizeBytes <= AVATAR_MAX_BYTES,
    { message: `Profile photos must be at most ${AVATAR_MAX_BYTES} bytes`, path: ["sizeBytes"] },
  )

export type CreateMediaUploadInput = z.input<typeof createMediaUploadInputSchema>

export const setAvatarInputSchema = z.object({
  mediaId: z.uuid(),
})

export type SetAvatarInput = z.input<typeof setAvatarInputSchema>

export const mediaViewSchema = z.object({
  id: z.uuid(),
  url: z.url(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  variants: z.array(
    z.object({
      url: z.url(),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
  ),
}) satisfies z.ZodType<MediaView>

export const mediaUploadTicketSchema = z.object({
  mediaId: z.uuid(),
  uploadUrl: z.url(),
  method: z.literal("PUT"),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.iso.datetime(),
}) satisfies z.ZodType<MediaUploadTicket>
