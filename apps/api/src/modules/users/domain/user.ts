import { isLocale, DEFAULT_LOCALE, type Locale } from "@ponto/i18n"
import type { UserRow } from "@ponto/database"
import type { PrivateProfile, PublicProfile } from "@ponto/types"

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
  "ponto",
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

export function toPublicProfile(user: User): PublicProfile {
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    bio: user.bio,
    followerCount: user.followerCount,
    followingCount: user.followingCount,
    createdAt: user.createdAt.toISOString(),
  }
}

export function toPrivateProfile(user: User): PrivateProfile {
  return {
    ...toPublicProfile(user),
    email: user.email,
    isEmailVerified: user.emailVerifiedAt !== null,
    locale: userLocale(user),
  }
}
