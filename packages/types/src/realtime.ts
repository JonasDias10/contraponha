// Events pushed to signed-in clients over Server-Sent Events.
export const RealtimeEventType = {
  NOTIFICATIONS_CHANGED: "notifications.changed",
  FEED_NEW_POST: "feed.new_post",
  POST_NEW_COMMENT: "post.new_comment",
} as const

export type RealtimeEventType = (typeof RealtimeEventType)[keyof typeof RealtimeEventType]

export interface NotificationsChangedEvent {
  type: typeof RealtimeEventType.NOTIFICATIONS_CHANGED
  unreadCount: number
}

// Someone the viewer follows published a post.
export interface FeedNewPostEvent {
  type: typeof RealtimeEventType.FEED_NEW_POST
  postId: string
}

// A contribution was added to the post being watched.
export interface PostNewCommentEvent {
  type: typeof RealtimeEventType.POST_NEW_COMMENT
  postId: string
  commentId: string
  parentId: string | null
}

export type RealtimeEvent = NotificationsChangedEvent | FeedNewPostEvent | PostNewCommentEvent
