import type { MediaView } from "./media.js"
import type { ReactionCounts } from "./reactions.js"
import type { PublicProfile } from "./users.js"

export const ContentRemoval = {
  AUTHOR: "author",
  MODERATION: "moderation",
} as const

export type ContentRemoval = (typeof ContentRemoval)[keyof typeof ContentRemoval]

export interface PostView {
  id: string
  author: PublicProfile | null
  body: string | null
  isDeleted: boolean
  removedBy: ContentRemoval | null
  media: MediaView[]
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
