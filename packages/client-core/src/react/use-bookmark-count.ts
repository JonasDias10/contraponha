"use client"

import { useQuery } from "@tanstack/react-query"

import { useClient } from "./client-context.js"
import { queryKeys } from "../query-keys.js"

export function useBookmarkCount(): number | undefined {
  const { api } = useClient()

  const { data } = useQuery({
    queryKey: queryKeys.bookmarkCount,
    queryFn: () => api.posts.countBookmarks(),
  })

  return data?.count
}
