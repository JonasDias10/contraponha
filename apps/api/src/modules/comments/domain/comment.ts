import { readReactionCounts, type CommentRevisionRow, type CommentRow } from "@ponto/database"
import type { CommentView, ContentRevision } from "@ponto/types"

import { toPublicProfile, type User } from "#src/modules/users/domain/user.js"

export type Comment = CommentRow

export type ActiveComment = Comment & { body: string; deletedAt: null }

export function isActiveComment(comment: Comment): comment is ActiveComment {
  return comment.deletedAt === null && comment.body !== null
}

// Replies are kept one level deep: answering a reply attaches the answer to the thread root.
export function threadRootId(comment: Comment): string {
  return comment.parentId ?? comment.id
}

export interface ToCommentViewParams {
  comment: Comment
  author: User | undefined
}

export function toCommentView({ comment, author }: ToCommentViewParams): CommentView {
  const isDeleted = !isActiveComment(comment)

  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    author: isDeleted || !author ? null : toPublicProfile(author),
    body: isDeleted ? null : comment.body,
    isDeleted,
    removedBy: comment.removedBy,
    replyCount: comment.replyCount,
    reactionCounts: readReactionCounts(comment),
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.editedAt?.toISOString() ?? null,
  }
}

export function toCommentRevision(revision: CommentRevisionRow): ContentRevision {
  return {
    id: revision.id,
    body: revision.body,
    createdAt: revision.createdAt.toISOString(),
  }
}
