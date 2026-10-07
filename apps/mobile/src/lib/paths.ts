import type { Href } from "expo-router"

import { webUrl } from "@/lib/env"

export interface CommentPathParams {
  postId: string
  commentId: string
}

export const paths = {
  profile: (handle: string): Href => ({ pathname: "/u/[handle]", params: { handle } }),
  followers: (handle: string): Href => ({ pathname: "/u/[handle]/followers", params: { handle } }),
  following: (handle: string): Href => ({ pathname: "/u/[handle]/following", params: { handle } }),
  post: (postId: string): Href => ({ pathname: "/posts/[postId]", params: { postId } }),
  comment: ({ postId, commentId }: CommentPathParams): Href => ({
    pathname: "/posts/[postId]",
    params: { postId, commentId },
  }),
  editPost: (postId: string): Href => ({ pathname: "/posts/[postId]/edit", params: { postId } }),
  history: (postId: string): Href => ({ pathname: "/posts/[postId]/history", params: { postId } }),
  topic: (slug: string): Href => ({ pathname: "/topics/[slug]", params: { slug } }),
}

export const shareUrls = {
  post: (postId: string): string => webUrl(`/posts/${postId}`),
  profile: (handle: string): string => webUrl(`/u/${encodeURIComponent(handle)}`),
}
