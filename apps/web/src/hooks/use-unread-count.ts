"use client"

import { useQuery } from "@tanstack/react-query"

import { useApi } from "@/components/providers/app-providers"
import { useViewer } from "@/components/providers/viewer-provider"
import { queryKeys } from "@/lib/query-keys"

const UNREAD_REFRESH_MS = 60_000

export function useUnreadCount(): number {
  const api = useApi()
  const viewer = useViewer()

  const { data } = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () => api.notifications.unreadCount(),
    enabled: viewer !== null,
    refetchInterval: UNREAD_REFRESH_MS,
  })

  return data?.count ?? 0
}
