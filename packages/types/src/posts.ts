import type { ReactionCounts } from "./reactions.js"
import type { PublicProfile } from "./users.js"

export interface PostView {
  id: string
  author: PublicProfile | null
  body: string | null
  isDeleted: boolean
  commentCount: number
  reactionCounts: ReactionCounts
  createdAt: string
  editedAt: string | null
}

export interface ContentRevision {
  id: string
  body: string
  createdAt: string
}

export interface ContentRevisionList {
  revisions: ContentRevision[]
}
