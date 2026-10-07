import type {
  CommentSort,
  NotificationFilter,
  ReportStatus,
  SearchPeriod,
  SearchSort,
} from "@ponto/types"

export interface ContentSearchKey {
  q: string
  sort: SearchSort
  period: SearchPeriod
  hasSource: boolean
  followingOnly: boolean
  hasHighlights: boolean
}

export interface CommentsKeyParams {
  postId: string
  sort: CommentSort
}

export interface ContributionsKeyParams {
  handle: string
  onlyHighlighted: boolean
}

export interface ConnectionsKeyParams {
  handle: string
  direction: "followers" | "following"
}

// One place for every cache key, so invalidations after mutations stay consistent.
export const queryKeys = {
  me: ["me"] as const,
  feed: {
    all: ["feed"] as const,
    following: ["feed", "following"] as const,
    discover: ["feed", "discover"] as const,
    topic: (slug: string) => ["feed", "topic", slug] as const,
    discussions: ["feed", "discussions"] as const,
  },
  post: (postId: string) => ["post", postId] as const,
  postRevisions: (postId: string) => ["post", postId, "revisions"] as const,
  comments: ({ postId, sort }: CommentsKeyParams) => ["comments", postId, sort] as const,
  commentsOfPost: (postId: string) => ["comments", postId] as const,
  replies: (commentId: string) => ["replies", commentId] as const,
  profile: (handle: string) => ["profile", handle] as const,
  profilePosts: (handle: string) => ["profile", handle, "posts"] as const,
  contributions: ({ handle, onlyHighlighted }: ContributionsKeyParams) =>
    ["profile", handle, "contributions", onlyHighlighted] as const,
  followedBy: (handle: string) => ["profile", handle, "followed-by"] as const,
  followStatus: (handle: string) => ["profile", handle, "follow-status"] as const,
  connections: ({ handle, direction }: ConnectionsKeyParams) =>
    ["profile", handle, direction] as const,
  followedAmong: (userIds: readonly string[]) => ["follows", "status", ...userIds] as const,
  suggestions: ["people", "suggestions"] as const,
  topics: {
    curated: ["topics", "curated"] as const,
    followed: ["topics", "followed"] as const,
    one: (slug: string) => ["topics", slug] as const,
  },
  bookmarks: ["bookmarks"] as const,
  bookmarkCount: ["bookmarks", "count"] as const,
  notifications: (filter: NotificationFilter) => ["notifications", filter] as const,
  notificationsAll: ["notifications"] as const,
  unreadCount: ["notifications", "unread-count"] as const,
  notificationPreferences: ["notifications", "preferences"] as const,
  search: {
    users: (q: string) => ["search", "users", q] as const,
    topics: (q: string) => ["search", "topics", q] as const,
    posts: (key: ContentSearchKey) => ["search", "posts", key] as const,
    contributions: (key: ContentSearchKey) => ["search", "contributions", key] as const,
  },
  sessions: ["sessions"] as const,
  dataExports: ["data-exports"] as const,
  deletion: ["deletion"] as const,
  reports: (status: ReportStatus) => ["moderation", "reports", status] as const,
  moderationActions: ["moderation", "actions"] as const,
}
