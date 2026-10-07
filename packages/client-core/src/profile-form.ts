import type { PrivateProfile } from "@contraponha/types"
import {
  bioSchema,
  displayNameSchema,
  HEADLINE_MAX_LENGTH,
  httpUrlSchema,
  LOCATION_MAX_LENGTH,
  PRONOUNS_MAX_LENGTH,
} from "@contraponha/validation"
import { z } from "zod"

export const profileFormSchema = z.object({
  displayName: displayNameSchema,
  headline: z.string().trim().max(HEADLINE_MAX_LENGTH),
  bio: bioSchema,
  location: z.string().trim().max(LOCATION_MAX_LENGTH),
  website: z.union([httpUrlSchema, z.literal("")]),
  pronouns: z.string().trim().max(PRONOUNS_MAX_LENGTH),
})

export type ProfileFormValues = z.input<typeof profileFormSchema>

export type ProfileFormOutput = z.output<typeof profileFormSchema>

export function profileFormValuesFrom(viewer: PrivateProfile): ProfileFormValues {
  return {
    displayName: viewer.displayName,
    headline: viewer.headline ?? "",
    bio: viewer.bio ?? "",
    location: viewer.location ?? "",
    website: viewer.website ?? "",
    pronouns: viewer.pronouns ?? "",
  }
}
