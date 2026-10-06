import type { ContentSource } from "./content.js"
import type { CommunityRule } from "./moderation.js"
import type { ContentRemoval, PostSummary } from "./posts.js"
import type { ReactionCounts, ReactionKind } from "./reactions.js"
import type { PublicProfile } from "./users.js"

export interface CommentView {
  id: string
  postId: string
  parentId: string | null
  author: PublicProfile | null
  body: string | null
  sources: ContentSource[]
  isDeleted: boolean
  removedBy: ContentRemoval | null
  removalRule: CommunityRule | null
  highlight: CommentHighlight | null
  isByPostAuthor: boolean
  replyCount: number
  reactionCounts: ReactionCounts
  createdAt: string
  editedAt: string | null
  viewer: CommentViewerState | null
}

export interface CommentHighlight {
  note: string | null
  highlightedAt: string
}

export interface CommentViewerState {
  reactions: ReactionKind[]
}

export const CommentSort = {
  RELEVANT: "relevant",
  RECENT: "recent",
} as const

export type CommentSort = (typeof CommentSort)[keyof typeof CommentSort]

// A comment listed outside its discussion (profile tabs, search), with the post it belongs to.
export interface ContributionView {
  comment: CommentView
  post: PostSummary
}
