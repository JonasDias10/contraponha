import type { CommunityRule } from "./moderation.js"
import type { TopicSummary } from "./topics.js"
import type { PrivateProfile, PublicProfile, UserRole } from "./users.js"

export const AccountStatus = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  BANNED: "banned",
  DELETION_SCHEDULED: "deletion_scheduled",
  DELETED: "deleted",
} as const

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus]

export interface SuspensionView {
  id: string
  rule: CommunityRule
  note: string | null
  // Null means a permanent ban.
  endsAt: string | null
  createdAt: string
  liftedAt: string | null
  moderator: PublicProfile | null
  isActive: boolean
}

export interface AdminUserSummary {
  user: PrivateProfile
  status: AccountStatus
  suspension: SuspensionView | null
}

export interface AdminUserDetail extends AdminUserSummary {
  suspensions: SuspensionView[]
  reportsAgainst: number
  reportsFiled: number
  lastActiveAt: string | null
}

export interface DailyMetric {
  date: string
  signups: number
  posts: number
  comments: number
  reports: number
}

export interface AdminMetrics {
  totals: {
    users: number
    activeUsers7d: number
    posts: number
    comments: number
    openReports: number
    activeSuspensions: number
  }
  daily: DailyMetric[]
}

export interface AdminTopic extends TopicSummary {
  id: string
  postCount: number
  followerCount: number
  createdAt: string
}

export type AdminRoleFilter = UserRole
