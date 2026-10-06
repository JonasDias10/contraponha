import { MEDIA_ALLOWED_TYPES, MEDIA_MAX_BYTES } from "@ponto/config"
import type { MediaUploadTicket, MediaView } from "@ponto/types"
import { z } from "zod"

export const mediaMimeTypeSchema = z.enum(MEDIA_ALLOWED_TYPES)

export const createMediaUploadInputSchema = z.object({
  mimeType: mediaMimeTypeSchema,
  sizeBytes: z.number().int().min(1).max(MEDIA_MAX_BYTES),
})

export type CreateMediaUploadInput = z.input<typeof createMediaUploadInputSchema>

export const mediaViewSchema = z.object({
  id: z.uuid(),
  url: z.url(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
}) satisfies z.ZodType<MediaView>

export const mediaUploadTicketSchema = z.object({
  mediaId: z.uuid(),
  uploadUrl: z.url(),
  method: z.literal("PUT"),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.iso.datetime(),
}) satisfies z.ZodType<MediaUploadTicket>
