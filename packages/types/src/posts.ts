import type { ContentSource, ReplyPolicy } from "./content.js"
import type { MediaView } from "./media.js"
import type { CommunityRule, ContextNoteView } from "./moderation.js"
import type { ReactionCounts, ReactionKind } from "./reactions.js"
import type { TopicSummary } from "./topics.js"
import type { PublicProfile } from "./users.js"

export const ContentRemoval = {
  AUTHOR: "author",
  MODERATION: "moderation",
} as const

export type ContentRemoval = (typeof ContentRemoval)[keyof typeof ContentRemoval]

export interface PostViewerState {
  reactions: ReactionKind[]
  isBookmarked: boolean
  canReply: boolean
  hasReposted: boolean
}

// The post embedded in a quote. Removed originals keep only their id and the flag.
export interface QuotedPostView {
  id: string
  title: string | null
  excerpt: string | null
  author: PublicProfile | null
  createdAt: string
  isDeleted: boolean
}

export interface PostView {
  id: string
  author: PublicProfile | null
  title: string | null
  body: string | null
  sources: ContentSource[]
  topics: TopicSummary[]
  replyPolicy: ReplyPolicy
  isPinned: boolean
  isDeleted: boolean
  removedBy: ContentRemoval | null
  removalRule: CommunityRule | null
  contextNote: ContextNoteView | null
  media: MediaView[]
  commentCount: number
  highlightedCommentCount: number
  repostCount: number
  quoteCount: number
  quotedPost: QuotedPostView | null
  reactionCounts: ReactionCounts
  createdAt: string
  editedAt: string | null
  revisionCount: number
  viewer: PostViewerState | null
}

export interface ContentRevision {
  id: string
  title: string | null
  body: string
  sources: ContentSource[]
  reason: string | null
  createdAt: string
}

export interface PostSummary {
  id: string
  title: string | null
  excerpt: string | null
  author: PublicProfile | null
}

export interface ContentRevisionList {
  revisions: ContentRevision[]
}

export interface BookmarkCount {
  count: number
}
