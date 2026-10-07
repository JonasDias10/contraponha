import type { Route } from "next"

// Dynamic paths built in one place; Next's typed routes need the template cast to Route.
export const paths = {
  profile: (handle: string): Route => `/u/${encodeURIComponent(handle)}` as Route,
  followers: (handle: string): Route => `/u/${encodeURIComponent(handle)}/followers` as Route,
  following: (handle: string): Route => `/u/${encodeURIComponent(handle)}/following` as Route,
  post: (postId: string): Route => `/posts/${postId}` as Route,
  discussion: (postId: string): Route => `/posts/${postId}#discussion` as Route,
  editPost: (postId: string): Route => `/posts/${postId}/edit` as Route,
  comment: ({ postId, commentId }: CommentPathParams): Route =>
    `/posts/${postId}#c-${commentId}` as Route,
  topic: (slug: string): Route => `/topics/${encodeURIComponent(slug)}` as Route,
  guidelineRule: (rule: string): Route => `/guidelines#${rule}` as Route,
  search: (query: string): Route => `/search?q=${encodeURIComponent(query)}` as Route,
}

export interface CommentPathParams {
  postId: string
  commentId: string
}
