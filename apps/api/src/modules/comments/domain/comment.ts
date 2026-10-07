import { readReactionCounts, type CommentRevisionRow, type CommentRow } from "@contraponha/database"
import type {
  CommentView,
  CommentViewerState,
  ContentRevision,
  ContributionView,
  PostSummary,
} from "@contraponha/types"

import { toSourceViews } from "#src/common/content/sources.js"
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

// Weights for "most relevant" ordering in a discussion; agreement plays no part.
export const RELEVANCE_WEIGHTS = {
  goodArgument: 3,
  changedMyMind: 3,
  insightful: 2,
  reply: 1,
} as const

export interface ToCommentViewParams {
  comment: Comment
  author: User | undefined
  postAuthorId: string | undefined
  viewer: CommentViewerState | null
}

export function toCommentView({
  comment,
  author,
  postAuthorId,
  viewer,
}: ToCommentViewParams): CommentView {
  const isDeleted = !isActiveComment(comment)

  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    author: isDeleted || !author ? null : toPublicProfile(author),
    body: isDeleted ? null : comment.body,
    sources: isDeleted ? [] : toSourceViews(comment.sources),
    isDeleted,
    removedBy: comment.removedBy,
    removalRule: comment.removalRule,
    highlight:
      !isDeleted && comment.highlightedAt
        ? { note: comment.highlightNote, highlightedAt: comment.highlightedAt.toISOString() }
        : null,
    isByPostAuthor: !isDeleted && comment.authorId === postAuthorId,
    replyCount: comment.replyCount,
    reactionCounts: readReactionCounts(comment),
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.editedAt?.toISOString() ?? null,
    viewer,
  }
}

export interface ToContributionViewParams {
  comment: CommentView
  post: PostSummary | undefined
}

export function toContributionView({ comment, post }: ToContributionViewParams): ContributionView {
  return {
    comment,
    post: post ?? { id: comment.postId, title: null, excerpt: null, author: null },
  }
}

// `reason` explains why this version was replaced by the next one.
export function toCommentRevision(revision: CommentRevisionRow): ContentRevision {
  return {
    id: revision.id,
    title: null,
    body: revision.body,
    sources: toSourceViews(revision.sources),
    reason: revision.reason,
    createdAt: revision.createdAt.toISOString(),
  }
}
