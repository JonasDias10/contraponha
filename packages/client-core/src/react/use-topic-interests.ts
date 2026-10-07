"use client"

import type { TopicView } from "@contraponha/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { errorMessage } from "../api-errors.js"
import { queryKeys } from "../query-keys.js"
import { useClient } from "./client-context.js"

interface TopicFollowChange {
  slug: string
  isFollowing: boolean
}

export interface TopicInterests {
  curated: TopicView[]
  hashtags: TopicView[]
  selected: Set<string>
  toggle: (slug: string) => void
}

// The followed set reflects a pending change immediately, before the server answers.
export function useTopicInterests(): TopicInterests {
  const { api, t, notify } = useClient()
  const queryClient = useQueryClient()

  const curated = useQuery({
    queryKey: queryKeys.topics.curated,
    queryFn: () => api.topics.listCurated(),
  })

  const followed = useQuery({
    queryKey: queryKeys.topics.followed,
    queryFn: () => api.topics.listFollowed(),
  })

  const mutation = useMutation({
    mutationFn: ({ slug, isFollowing }: TopicFollowChange) =>
      isFollowing ? api.topics.follow(slug) : api.topics.unfollow(slug),
    onError: (error) => notify.error(errorMessage({ error, t })),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.topics.followed }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.discover }),
      ]),
  })

  const selected = new Set(followed.data?.topics.map(({ slug }) => slug) ?? [])

  if (mutation.isPending) {
    const { slug, isFollowing } = mutation.variables

    if (isFollowing) selected.add(slug)
    else selected.delete(slug)
  }

  return {
    curated: curated.data?.topics ?? [],
    hashtags: (followed.data?.topics ?? []).filter(({ isCurated }) => !isCurated),
    selected,
    toggle: (slug) => mutation.mutate({ slug, isFollowing: !selected.has(slug) }),
  }
}
