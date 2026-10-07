import type { ContentRevision, PostView } from "@contraponha/types"

export interface PostVersion {
  number: number
  title: string | null
  body: string
  reason: string | null
  createdAt: string
  isCurrent: boolean
}

export interface ToVersionsParams {
  post: PostView
  revisions: ContentRevision[]
}

// Revisions are previous versions (newest first); each carries the reason it was replaced.
export function toVersions({ post, revisions }: ToVersionsParams): PostVersion[] {
  const oldestFirst = revisions.toReversed()

  const previous = oldestFirst.map((revision, index) => ({
    number: index + 1,
    title: revision.title,
    body: revision.body,
    reason: index === 0 ? null : (oldestFirst[index - 1]?.reason ?? null),
    createdAt: revision.createdAt,
    isCurrent: false,
  }))

  const current = {
    number: oldestFirst.length + 1,
    title: post.title,
    body: post.body ?? "",
    reason: oldestFirst.at(-1)?.reason ?? null,
    createdAt: post.editedAt ?? post.createdAt,
    isCurrent: true,
  }

  return [current, ...previous.toReversed()]
}
