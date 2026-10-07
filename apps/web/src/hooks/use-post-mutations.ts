"use client"

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"
import { toast } from "sonner"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { errorMessage } from "@/lib/api-errors"
import { queryKeys } from "@/lib/query-keys"

export interface BookmarkChange {
  postId: string
  isSaving: boolean
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
  const api = useApi()
  const { t } = useI18n()
  const refresh = useRefreshPostLists()

  return useMutation({
    mutationFn: ({ postId, isSaving }: BookmarkChange) =>
      isSaving ? api.posts.bookmark(postId) : api.posts.removeBookmark(postId),
    onError: (error) => toast.error(errorMessage({ error, t })),
    onSettled: (_data, _error, { postId }) => refresh(postId),
  })
}

export function usePinMutation(): UseMutationResult<void, Error, PinChange> {
  const api = useApi()
  const { t } = useI18n()
  const refresh = useRefreshPostLists()

  return useMutation({
    mutationFn: ({ postId, isPinning }: PinChange) =>
      isPinning ? api.posts.pin(postId) : api.posts.unpin(postId),
    onError: (error) => toast.error(errorMessage({ error, t })),
    onSettled: (_data, _error, { postId }) => refresh(postId),
  })
}

export function useDeletePostMutation(): UseMutationResult<void, Error, string> {
  const api = useApi()
  const { t } = useI18n()
  const refresh = useRefreshPostLists()

  return useMutation({
    mutationFn: (postId: string) => api.posts.delete(postId),
    onSuccess: () => toast.success(t("web.post.deleted")),
    onError: (error) => toast.error(errorMessage({ error, t })),
    onSettled: (_data, _error, postId) => refresh(postId),
  })
}
