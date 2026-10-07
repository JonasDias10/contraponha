"use client"

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage, queryKeys } from "@contraponha/client-core"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"

export interface FollowChange {
  handle: string
  isFollowing: boolean
}

export function useFollowMutation(): UseMutationResult<void, Error, FollowChange> {
  const api = useApi()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ handle, isFollowing }: FollowChange) =>
      isFollowing ? api.follows.follow(handle) : api.follows.unfollow(handle),
    onError: (error) => toast.error(errorMessage({ error, t })),
    onSettled: (_data, _error, { handle }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(handle) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.followStatus(handle) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.suggestions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.following }),
      ]),
  })
}
