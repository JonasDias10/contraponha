import { readReactionCounts, type PostRevisionRow, type PostRow } from "@contraponha/database"
import type {
  ContentRevision,
  ContextNoteView,
  MediaView,
  PostSummary,
  PostView,
  PostViewerState,
  TopicSummary,
} from "@contraponha/types"

import { toExcerpt, toSourceViews } from "#src/common/content/sources.js"
import { toPublicProfile, type User } from "#src/modules/users/domain/user.js"

export type Post = PostRow

export type ActivePost = Post & { body: string; deletedAt: null }

export function isActivePost(post: Post): post is ActivePost {
  return post.deletedAt === null && post.body !== null
}

export interface ToPostViewParams {
  post: Post
  author: User | undefined
  media: MediaView[]
  topics: TopicSummary[]
  contextNote: ContextNoteView | null
  revisionCount: number
  viewer: PostViewerState | null
}

export function toPostView({
  post,
  author,
  media,
  topics,
  contextNote,
  revisionCount,
  viewer,
}: ToPostViewParams): PostView {
  const isDeleted = !isActivePost(post)

  return {
    id: post.id,
    author: isDeleted || !author ? null : toPublicProfile(author),
    title: isDeleted ? null : post.title,
    body: isDeleted ? null : post.body,
    sources: isDeleted ? [] : toSourceViews(post.sources),
    topics: isDeleted ? [] : topics,
    replyPolicy: post.replyPolicy,
    isPinned: post.pinnedAt !== null,
    isDeleted,
    removedBy: post.removedBy,
    removalRule: post.removalRule,
    contextNote: isDeleted ? null : contextNote,
    media: isDeleted ? [] : media,
    commentCount: post.commentCount,
    highlightedCommentCount: post.highlightedCommentCount,
    reactionCounts: readReactionCounts(post),
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString() ?? null,
    revisionCount: isDeleted ? 0 : revisionCount,
    viewer,
  }
}

export interface ToPostSummaryParams {
  post: Post
  author: User | undefined
}

export function toPostSummary({ post, author }: ToPostSummaryParams): PostSummary {
  const isDeleted = !isActivePost(post)

  return {
    id: post.id,
    title: isDeleted ? null : post.title,
    excerpt: isDeleted ? null : toExcerpt(post.body),
    author: isDeleted || !author ? null : toPublicProfile(author),
  }
}

// `reason` explains why this version was replaced by the next one.
export function toContentRevision(revision: PostRevisionRow): ContentRevision {
  return {
    id: revision.id,
    title: revision.title,
    body: revision.body,
    sources: toSourceViews(revision.sources),
    reason: revision.reason,
    createdAt: revision.createdAt.toISOString(),
  }
}
