import { isLocale, DEFAULT_LOCALE, type Locale } from "@contraponha/i18n"
import type { UserRow } from "@contraponha/database"
import type { PrivateProfile, PublicProfile } from "@contraponha/types"

export type User = UserRow

const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  "about",
  "admin",
  "api",
  "app",
  "help",
  "login",
  "logout",
  "me",
  "moderation",
  "contraponha",
  "privacy",
  "register",
  "root",
  "settings",
  "support",
  "system",
  "terms",
])

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle)
}

export function userLocale(user: User): Locale {
  return isLocale(user.locale) ? user.locale : DEFAULT_LOCALE
}

export function isDeletedUser(user: User): boolean {
  return user.deletedAt !== null
}

// Deleted accounts stay as anonymous tombstones so the discussions they took part in
// still make sense; nothing about the person is exposed.
export function toPublicProfile(user: User): PublicProfile {
  const isDeleted = isDeletedUser(user)

  return {
    id: user.id,
    handle: user.handle,
    displayName: isDeleted ? "" : user.displayName,
    bio: isDeleted ? null : user.bio,
    headline: isDeleted ? null : user.headline,
    location: isDeleted ? null : user.location,
    website: isDeleted ? null : user.website,
    pronouns: isDeleted ? null : user.pronouns,
    followerCount: user.followerCount,
    followingCount: user.followingCount,
    postCount: user.postCount,
    isDeleted,
    createdAt: user.createdAt.toISOString(),
  }
}

export function toPrivateProfile(user: User): PrivateProfile {
  return {
    ...toPublicProfile(user),
    email: user.email,
    isEmailVerified: user.emailVerifiedAt !== null,
    locale: userLocale(user),
    timezone: user.timezone,
    role: user.role,
    birthDate: user.birthDate,
    isOnboarded: user.onboardedAt !== null,
    deletionScheduledAt: user.deletionScheduledAt?.toISOString() ?? null,
  }
}
