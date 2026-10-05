import type { ReactionCounts } from "./reactions.js"
import type { PublicProfile } from "./users.js"

export interface CommentView {
  id: string
  postId: string
  parentId: string | null
  author: PublicProfile | null
  body: string | null
  isDeleted: boolean
  replyCount: number
  reactionCounts: ReactionCounts
  createdAt: string
  editedAt: string | null
}
