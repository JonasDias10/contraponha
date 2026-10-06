import type { PublicProfile } from "./users.js"

export const NotificationType = {
  POST_COMMENTED: "post_commented",
  COMMENT_REPLIED: "comment_replied",
  POST_REACTED: "post_reacted",
  COMMENT_REACTED: "comment_reacted",
  USER_FOLLOWED: "user_followed",
} as const

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export interface NotificationView {
  id: string
  type: NotificationType
  actor: PublicProfile | null
  postId: string | null
  commentId: string | null
  isRead: boolean
  createdAt: string
}

export interface UnreadNotificationCount {
  count: number
}
