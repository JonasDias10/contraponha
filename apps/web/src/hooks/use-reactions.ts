"use client"

import { REACTIONS_PER_TARGET_MAX } from "@contraponha/config"
import type { ReactionCounts, ReactionKind, ReactionTargetType } from "@contraponha/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { errorMessage, queryKeys } from "@contraponha/client-core"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"

export interface UseReactionsParams {
  targetType: ReactionTargetType
  targetId: string
  postId: string
  initialReactions: ReactionKind[]
  initialCounts: ReactionCounts
}

export interface ReactionsState {
  reactions: ReactionKind[]
  counts: ReactionCounts
  isLimitReached: boolean
  toggle: (kind: ReactionKind) => void
}

interface ReactionChange {
  kind: ReactionKind
  isAdding: boolean
}

// The bar updates immediately; a failed request restores what the server last said.
export function useReactions({
  targetType,
  targetId,
  postId,
  initialReactions,
  initialCounts,
}: UseReactionsParams): ReactionsState {
  const api = useApi()
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [reactions, setReactions] = useState(initialReactions)
  const [counts, setCounts] = useState(initialCounts)

  const mutation = useMutation({
    mutationFn: ({ kind, isAdding }: ReactionChange) =>
      isAdding
        ? api.reactions.add({ targetType, targetId, kind })
        : api.reactions.remove({ targetType, targetId, kind }),
    onError: (error) => {
      setReactions(initialReactions)

      setCounts(initialCounts)

      toast.error(errorMessage({ error, t }))
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.commentsOfPost(postId) }),
      ]),
  })

  const isLimitReached = reactions.length >= REACTIONS_PER_TARGET_MAX

  const toggle = (kind: ReactionKind): void => {
    const isAdding = !reactions.includes(kind)

    if (isAdding && isLimitReached) {
      toast(t("web.reactions.limit"))

      return
    }

    setReactions((current) => (isAdding ? [...current, kind] : current.filter((k) => k !== kind)))

    setCounts((current) => ({ ...current, [kind]: current[kind] + (isAdding ? 1 : -1) }))

    mutation.mutate({ kind, isAdding })
  }

  return { reactions, counts, isLimitReached, toggle }
}
