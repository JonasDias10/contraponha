import type { Locale } from "@ponto/i18n"

export const UserRole = {
  MEMBER: "member",
  MODERATOR: "moderator",
  ADMIN: "admin",
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export interface PublicProfile {
  id: string
  handle: string
  displayName: string
  bio: string | null
  followerCount: number
  followingCount: number
  createdAt: string
}

export interface PrivateProfile extends PublicProfile {
  email: string
  isEmailVerified: boolean
  locale: Locale
  role: UserRole
}
