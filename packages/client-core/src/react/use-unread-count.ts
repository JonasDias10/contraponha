"use client"

import { useQuery } from "@tanstack/react-query"

import { useClient } from "./client-context.js"
import { queryKeys } from "../query-keys.js"

const UNREAD_REFRESH_MS = 60_000

export interface UseUnreadCountParams {
  isEnabled: boolean
}

export function useUnreadCount({ isEnabled }: UseUnreadCountParams): number {
  const { api } = useClient()

  const { data } = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => api.notifications.unreadCount(),
    enabled: isEnabled,
    refetchInterval: UNREAD_REFRESH_MS,
  })

  return data?.count ?? 0
}
