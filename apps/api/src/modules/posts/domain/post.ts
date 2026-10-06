import { readReactionCounts, type PostRevisionRow, type PostRow } from "@ponto/database"
import type { ContentRevision, MediaView, PostView } from "@ponto/types"

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
}

export function toPostView({ post, author, media }: ToPostViewParams): PostView {
  const isDeleted = !isActivePost(post)

  return {
    id: post.id,
    author: isDeleted || !author ? null : toPublicProfile(author),
    body: isDeleted ? null : post.body,
    isDeleted,
    removedBy: post.removedBy,
    media: isDeleted ? [] : media,
    commentCount: post.commentCount,
    reactionCounts: readReactionCounts(post),
    createdAt: post.createdAt.toISOString(),
    editedAt: post.editedAt?.toISOString() ?? null,
  }
}

export function toContentRevision(revision: PostRevisionRow): ContentRevision {
  return {
    id: revision.id,
    body: revision.body,
    createdAt: revision.createdAt.toISOString(),
  }
}
