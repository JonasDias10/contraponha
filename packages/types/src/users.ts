import type { Locale } from "@ponto/i18n"

import type { TopicSummary } from "./topics.js"

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
  headline: string | null
  location: string | null
  website: string | null
  pronouns: string | null
  followerCount: number
  followingCount: number
  postCount: number
  isDeleted: boolean
  createdAt: string
}

export const RecognitionKind = {
  GOOD_ARGUMENT: "good_argument",
  INSIGHTFUL: "insightful",
} as const

export type RecognitionKind = (typeof RecognitionKind)[keyof typeof RecognitionKind]

// What the person is recognized for, from the quality reactions their writing received.
export interface Recognition {
  kind: RecognitionKind
  topics: TopicSummary[]
}

export interface ProfileViewerState {
  isFollowing: boolean
  isFollowedBy: boolean
}

export interface ProfileView extends PublicProfile {
  recognition: Recognition | null
  topics: TopicSummary[]
  viewer: ProfileViewerState | null
}

export interface FollowedByPreview {
  people: PublicProfile[]
  total: number
}

export interface SuggestedPerson {
  profile: PublicProfile
  recognition: Recognition | null
}

export interface SuggestedPeople {
  people: SuggestedPerson[]
}

export interface PrivateProfile extends PublicProfile {
  email: string
  isEmailVerified: boolean
  locale: Locale
  timezone: string
  role: UserRole
  birthDate: string | null
  isOnboarded: boolean
  deletionScheduledAt: string | null
}
