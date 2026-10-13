"use client"

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"

import { errorMessage } from "../api-errors.js"
import { queryKeys } from "../query-keys.js"
import { useClient } from "./client-context.js"

export interface BookmarkChange {
  postId: string
  isSaving: boolean
}

export interface RepostChange {
  postId: string
  isReposting: boolean
}

export interface PinChange {
  postId: string
  isPinning: boolean
}

// Lists that show posts (feeds, profile, saved, search) are refreshed after any change,
// so every view agrees with the server.
function useRefreshPostLists(): (postId: string) => Promise<void> {
  const queryClient = useQueryClient()

  return async (postId) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.feed.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks }),
      queryClient.invalidateQueries({ queryKey: ["profile"] }),
      queryClient.invalidateQueries({ queryKey: ["search"] }),
    ])
  }
}

export function useBookmarkMutation(): UseMutationResult<void, Error, BookmarkChange> {
  const { api, t, notify } = useClient()
  const refresh = useRefreshPostLists()

  return useMutation({
    mutationFn: ({ postId, isSaving }: BookmarkChange) =>
      isSaving ? api.posts.bookmark(postId) : api.posts.removeBookmark(postId),
    onError: (error) => notify.error(errorMessage({ error, t })),
    onSettled: (_data, _error, { postId }) => refresh(postId),
  })
}

export function useRepostMutation(): UseMutationResult<void, Error, RepostChange> {
  const { api, t, notify } = useClient()
  const refresh = useRefreshPostLists()

  return useMutation({
    mutationFn: ({ postId, isReposting }: RepostChange) =>
      isReposting ? api.posts.repost(postId) : api.posts.unrepost(postId),
    onSuccess: (_data, { isReposting }) =>
      notify.success(isReposting ? t("web.repost.done") : t("web.repost.undone")),
    onError: (error) => notify.error(errorMessage({ error, t })),
    onSettled: (_data, _error, { postId }) => refresh(postId),
  })
}

export function usePinMutation(): UseMutationResult<void, Error, PinChange> {
  const { api, t, notify } = useClient()
  const refresh = useRefreshPostLists()

  return useMutation({
    mutationFn: ({ postId, isPinning }: PinChange) =>
      isPinning ? api.posts.pin(postId) : api.posts.unpin(postId),
    onError: (error) => notify.error(errorMessage({ error, t })),
    onSettled: (_data, _error, { postId }) => refresh(postId),
  })
}

export function useDeletePostMutation(): UseMutationResult<void, Error, string> {
  const { api, t, notify } = useClient()
  const refresh = useRefreshPostLists()

  return useMutation({
    mutationFn: (postId: string) => api.posts.delete(postId),
    onSuccess: () => notify.success(t("web.post.deleted")),
    onError: (error) => notify.error(errorMessage({ error, t })),
    onSettled: (_data, _error, postId) => refresh(postId),
  })
}
