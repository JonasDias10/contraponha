"use client"

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"

import { errorMessage } from "../api-errors.js"
import { queryKeys } from "../query-keys.js"
import { useClient } from "./client-context.js"

export interface FollowChange {
  handle: string
  isFollowing: boolean
}

export function useFollowMutation(): UseMutationResult<void, Error, FollowChange> {
  const { api, t, notify } = useClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ handle, isFollowing }: FollowChange) =>
      isFollowing ? api.follows.follow(handle) : api.follows.unfollow(handle),
    onError: (error) => notify.error(errorMessage({ error, t })),
    onSettled: (_data, _error, { handle }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(handle) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.followStatus(handle) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.suggestions }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.following }),
      ]),
  })
}
