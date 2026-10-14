import { SUPPORTED_LOCALES } from "@contraponha/i18n"
import {
  RecognitionKind,
  UserRole,
  type FollowedByPreview,
  type PrivateProfile,
  type ProfileView,
  type PublicProfile,
  type SuggestedPeople,
} from "@contraponha/types"
import { z } from "zod"

import { httpUrlSchema } from "./content.js"
import { topicSummarySchema } from "./topics.js"

export const HANDLE_MIN_LENGTH = 3
export const HANDLE_MAX_LENGTH = 30
export const DISPLAY_NAME_MAX_LENGTH = 50
export const BIO_MAX_LENGTH = 280
export const HEADLINE_MAX_LENGTH = 80
export const LOCATION_MAX_LENGTH = 60
export const PRONOUNS_MAX_LENGTH = 30

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

function optionalTextSchema(max: number): z.ZodType<string | null, string> {
  return z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
}

export const timezoneSchema = z
  .string()
  .max(64)
  .refine((zone) => Intl.supportedValuesOf("timeZone").includes(zone), {
    message: "Unknown time zone",
  })

export const updateProfileInputSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    bio: bioSchema.nullable().optional(),
    headline: optionalTextSchema(HEADLINE_MAX_LENGTH).nullable().optional(),
    location: optionalTextSchema(LOCATION_MAX_LENGTH).nullable().optional(),
    website: z
      .union([httpUrlSchema, z.literal("").transform(() => null)])
      .nullable()
      .optional(),
    pronouns: optionalTextSchema(PRONOUNS_MAX_LENGTH).nullable().optional(),
    locale: localeSchema.optional(),
    timezone: timezoneSchema.optional(),
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
  headline: z.string().nullable(),
  location: z.string().nullable(),
  website: z.string().nullable(),
  pronouns: z.string().nullable(),
  avatarUrl: z.url().nullable(),
  followerCount: z.number().int().nonnegative(),
  followingCount: z.number().int().nonnegative(),
  postCount: z.number().int().nonnegative(),
  isDeleted: z.boolean(),
  createdAt: z.iso.datetime(),
}) satisfies z.ZodType<PublicProfile>

export const recognitionSchema = z.object({
  kind: z.enum(RecognitionKind),
  topics: z.array(topicSummarySchema),
})

export const profileViewSchema = publicProfileSchema.extend({
  recognition: recognitionSchema.nullable(),
  topics: z.array(topicSummarySchema),
  viewer: z
    .object({
      isFollowing: z.boolean(),
      isFollowedBy: z.boolean(),
      isBlocking: z.boolean(),
      isBlockedBy: z.boolean(),
      isMuting: z.boolean(),
    })
    .nullable(),
}) satisfies z.ZodType<ProfileView>

export const followedByPreviewSchema = z.object({
  people: z.array(publicProfileSchema),
  total: z.number().int().nonnegative(),
}) satisfies z.ZodType<FollowedByPreview>

export const suggestedPeopleSchema = z.object({
  people: z.array(
    z.object({ profile: publicProfileSchema, recognition: recognitionSchema.nullable() }),
  ),
}) satisfies z.ZodType<SuggestedPeople>

export const privateProfileSchema = publicProfileSchema.extend({
  email: z.string(),
  isEmailVerified: z.boolean(),
  locale: localeSchema,
  timezone: z.string(),
  role: z.enum(UserRole),
  birthDate: z.iso.date().nullable(),
  isOnboarded: z.boolean(),
  isTwoFactorEnabled: z.boolean(),
  deletionScheduledAt: z.iso.datetime().nullable(),
}) satisfies z.ZodType<PrivateProfile>
