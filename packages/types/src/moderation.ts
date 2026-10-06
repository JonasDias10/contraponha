import type { PublicProfile } from "./users.js"

export const ReportTargetType = {
  POST: "post",
  COMMENT: "comment",
  USER: "user",
} as const

export type ReportTargetType = (typeof ReportTargetType)[keyof typeof ReportTargetType]

export const ReportReason = {
  SPAM: "spam",
  HARASSMENT: "harassment",
  HATE: "hate",
  MISINFORMATION: "misinformation",
  VIOLENCE: "violence",
  SEXUAL_CONTENT: "sexual_content",
  OTHER: "other",
} as const

export type ReportReason = (typeof ReportReason)[keyof typeof ReportReason]

export const ReportStatus = {
  OPEN: "open",
  RESOLVED: "resolved",
  DISMISSED: "dismissed",
} as const

export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus]

export const ReportResolution = {
  REMOVE_CONTENT: "remove_content",
  DISMISS: "dismiss",
} as const

export type ReportResolution = (typeof ReportResolution)[keyof typeof ReportResolution]

export const ModerationActionType = {
  CONTENT_REMOVED: "content_removed",
  REPORT_RESOLVED: "report_resolved",
  REPORT_DISMISSED: "report_dismissed",
  ROLE_CHANGED: "role_changed",
} as const

export type ModerationActionType = (typeof ModerationActionType)[keyof typeof ModerationActionType]

export interface ReportView {
  id: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  details: string | null
  status: ReportStatus
  reporter: PublicProfile | null
  createdAt: string
  resolvedAt: string | null
}

export interface ModerationActionView {
  id: string
  type: ModerationActionType
  moderator: PublicProfile | null
  reportId: string | null
  postId: string | null
  commentId: string | null
  targetUserId: string | null
  note: string | null
  createdAt: string
}
