import type { ContentSource } from "./content.js"
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
  CONTEXT_ADDED: "context_added",
  CONTEXT_REMOVED: "context_removed",
  USER_SUSPENDED: "user_suspended",
  SUSPENSION_LIFTED: "suspension_lifted",
  AVATAR_REMOVED: "avatar_removed",
  TOPIC_UPDATED: "topic_updated",
  VERIFICATION_GRANTED: "verification_granted",
  VERIFICATION_REVOKED: "verification_revoked",
} as const

export type ModerationActionType = (typeof ModerationActionType)[keyof typeof ModerationActionType]

// Rules of the community guidelines. Every removal names the rule it applied.
export const CommunityRule = {
  PERSONAL_ATTACK: "personal_attack",
  HARASSMENT: "harassment",
  HATE_SPEECH: "hate_speech",
  MISINFORMATION: "misinformation",
  SPAM: "spam",
  VIOLENCE: "violence",
  SEXUAL_CONTENT: "sexual_content",
  PRIVACY: "privacy",
  ILLEGAL_CONTENT: "illegal_content",
  IMPERSONATION: "impersonation",
} as const

export type CommunityRule = (typeof CommunityRule)[keyof typeof CommunityRule]

export const ReportSubject = {
  ME: "me",
  SOMEONE_ELSE: "someone_else",
  GROUP: "group",
} as const

export type ReportSubject = (typeof ReportSubject)[keyof typeof ReportSubject]

export interface ContextNoteView {
  id: string
  body: string
  sources: ContentSource[]
  createdAt: string
}

export interface ReportView {
  id: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  subject: ReportSubject | null
  details: string | null
  excerpt: string | null
  targetAuthor: PublicProfile | null
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
  rule: CommunityRule | null
  note: string | null
  createdAt: string
}
