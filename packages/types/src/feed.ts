import type { PostView } from "./posts.js"
import type { TopicSummary } from "./topics.js"
import type { PublicProfile } from "./users.js"

export const FeedReasonType = {
  FOLLOWED_TOPIC: "followed_topic",
  FEATURED: "featured",
} as const

export type FeedReasonType = (typeof FeedReasonType)[keyof typeof FeedReasonType]

// "Why am I seeing this": present on every recommended post, absent in the following feed.
export interface FeedReason {
  type: FeedReasonType
  topic: TopicSummary | null
}

export interface FeedItem {
  post: PostView
  reason: FeedReason | null
  // Set when the post is in the Following feed because someone you follow reposted it.
  repostedBy: PublicProfile | null
}

export interface DiscussionSummary {
  postId: string
  title: string
  commentCount: number
  highlightedCommentCount: number
}

export interface DiscussionList {
  discussions: DiscussionSummary[]
}
