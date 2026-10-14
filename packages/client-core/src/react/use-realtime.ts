"use client"

import { RealtimeEventType, type RealtimeEvent } from "@contraponha/types"
import { realtimeEventSchema } from "@contraponha/validation"
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { queryKeys } from "../query-keys.js"
import { useClient } from "./client-context.js"

const NO_IDS: string[] = []

interface ApplyEventParams {
  event: RealtimeEvent
  queryClient: QueryClient
}

interface AddPendingParams {
  queryClient: QueryClient
  queryKey: readonly unknown[]
  id: string
}

function addPending({ queryClient, queryKey, id }: AddPendingParams): void {
  queryClient.setQueryData<string[]>(queryKey, (ids = []) =>
    ids.includes(id) ? ids : [...ids, id],
  )
}

// Events only touch the cache: counters change at once, lists wait for the reader to ask
// for the new items so the page does not jump under them.
function applyEvent({ event, queryClient }: ApplyEventParams): void {
  if (event.type === RealtimeEventType.NOTIFICATIONS_CHANGED) {
    queryClient.setQueryData(queryKeys.unreadCount, { count: event.unreadCount })

    void queryClient.invalidateQueries({
      queryKey: queryKeys.notificationsAll,
      predicate: ({ queryKey }) => queryKey[1] !== "unread-count",
    })

    return
  }

  if (event.type === RealtimeEventType.FEED_NEW_POST) {
    addPending({ queryClient, queryKey: queryKeys.realtime.pendingFeedPosts, id: event.postId })

    return
  }

  addPending({
    queryClient,
    queryKey: queryKeys.realtime.pendingComments(event.postId),
    id: event.commentId,
  })
}

interface UseStreamParams {
  path: string
  isEnabled: boolean
}

function useStream({ path, isEnabled }: UseStreamParams): void {
  const { openStream } = useClient()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isEnabled || !openStream) return

    return openStream({
      path,
      onMessage: (data) => {
        const parsed = realtimeEventSchema.safeParse(JSON.parse(data))

        if (parsed.success) applyEvent({ event: parsed.data, queryClient })
      },
    })
  }, [openStream, path, isEnabled, queryClient])
}

// Mounted once in the signed-in app shell.
export function useRealtimeStream(isEnabled: boolean): void {
  useStream({ path: "/events", isEnabled })
}

export interface UsePostRealtimeParams {
  postId: string
  isEnabled: boolean
}

export function usePostRealtime({ postId, isEnabled }: UsePostRealtimeParams): void {
  useStream({ path: `/posts/${postId}/events`, isEnabled })
}

export interface PendingItems {
  count: number
  reveal: () => Promise<void>
}

interface UsePendingParams {
  pendingKey: readonly unknown[]
  listKeys: readonly (readonly unknown[])[]
}

function usePending({ pendingKey, listKeys }: UsePendingParams): PendingItems {
  const queryClient = useQueryClient()

  const { data = NO_IDS } = useQuery<string[]>({
    queryKey: pendingKey,
    queryFn: () => queryClient.getQueryData<string[]>(pendingKey) ?? NO_IDS,
    initialData: NO_IDS,
    staleTime: Infinity,
  })

  const reveal = async (): Promise<void> => {
    queryClient.setQueryData(pendingKey, NO_IDS)

    await Promise.all(listKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })))
  }

  return { count: data.length, reveal }
}

// "N new posts" above the Following feed.
export function usePendingFeedPosts(): PendingItems {
  return usePending({
    pendingKey: queryKeys.realtime.pendingFeedPosts,
    listKeys: [queryKeys.feed.following],
  })
}

// "N new contributions" in an open discussion.
export function usePendingComments(postId: string): PendingItems {
  return usePending({
    pendingKey: queryKeys.realtime.pendingComments(postId),
    listKeys: [queryKeys.commentsOfPost(postId), queryKeys.post(postId)],
  })
}
