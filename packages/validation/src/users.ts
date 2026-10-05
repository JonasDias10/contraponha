import { SUPPORTED_LOCALES } from "@ponto/i18n"
import type { PrivateProfile, PublicProfile } from "@ponto/types"
import { z } from "zod"

export const HANDLE_MIN_LENGTH = 3
export const HANDLE_MAX_LENGTH = 30
export const DISPLAY_NAME_MAX_LENGTH = 50
export const BIO_MAX_LENGTH = 280

export const localeSchema = z.enum(SUPPORTED_LOCALES)

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254))

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(HANDLE_MIN_LENGTH)
      .max(HANDLE_MAX_LENGTH)
      .regex(/^[a-z0-9_]+$/),
  )

export const displayNameSchema = z.string().trim().min(1).max(DISPLAY_NAME_MAX_LENGTH)

export const bioSchema = z
  .string()
  .trim()
  .max(BIO_MAX_LENGTH)
  .transform((bio) => (bio.length === 0 ? null : bio))

export const updateProfileInputSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    bio: bioSchema.nullable().optional(),
    locale: localeSchema.optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  })

export type UpdateProfileInput = z.input<typeof updateProfileInputSchema>

export const publicProfileSchema = z.object({
  id: z.uuid(),
  handle: z.string(),
  displayName: z.string(),
  bio: z.string().nullable(),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<PublicProfile>

export const privateProfileSchema = publicProfileSchema.extend({
  email: z.string(),
  isEmailVerified: z.boolean(),
  locale: localeSchema,
}) satisfies z.ZodType<PrivateProfile>
