import type { CommunityRule } from "./moderation.js"
import type { PostSummary } from "./posts.js"
import type { PublicProfile } from "./users.js"

export const NotificationType = {
  POST_COMMENTED: "post_commented",
  COMMENT_REPLIED: "comment_replied",
  POST_REACTED: "post_reacted",
  COMMENT_REACTED: "comment_reacted",
  USER_FOLLOWED: "user_followed",
  MENTIONED: "mentioned",
  COMMENT_HIGHLIGHTED: "comment_highlighted",
  SOURCE_REQUESTED: "source_requested",
  CONTENT_REMOVED: "content_removed",
  REPORT_RESOLVED: "report_resolved",
} as const

export const NotificationFilter = {
  ALL: "all",
  MENTIONS: "mentions",
  MODERATION: "moderation",
} as const

export type NotificationFilter = (typeof NotificationFilter)[keyof typeof NotificationFilter]

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export interface NotificationView {
  id: string
  type: NotificationType
  actors: PublicProfile[]
  actorCount: number
  post: PostSummary | null
  commentId: string | null
  commentExcerpt: string | null
  moderation: NotificationModeration | null
  isRead: boolean
  createdAt: string
}

export interface NotificationModeration {
  rule: CommunityRule | null
  wasRemoved: boolean
}

export interface NotificationPreferences {
  replies: boolean
  mentions: boolean
  highlights: boolean
  sourceRequests: boolean
  reactions: boolean
  follows: boolean
  digestHours: number[]
}

export interface UnreadNotificationCount {
  count: number
}
