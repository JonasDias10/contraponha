"use client"

import type { CommunityRule } from "@contraponha/types"
import type { ContextNoteInput } from "@contraponha/validation"
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"

import { errorMessage } from "../api-errors.js"
import { useClient } from "./client-context.js"

export interface RemoveContentChange {
  targetType: "post" | "comment"
  targetId: string
  rule: CommunityRule
}

export interface ContextNoteChange {
  postId: string
  input: ContextNoteInput | null
}

export function useRemoveContentMutation(): UseMutationResult<void, Error, RemoveContentChange> {
  const { api, t, notify } = useClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ targetType, targetId, rule }: RemoveContentChange) =>
      targetType === "post"
        ? api.moderation.removePost({ targetId, input: { rule } })
        : api.moderation.removeComment({ targetId, input: { rule } }),
    onSuccess: () => notify.success(t("web.moderation.removed")),
    onError: (error) => notify.error(errorMessage({ error, t })),
    onSettled: () => queryClient.invalidateQueries(),
  })
}

export function useContextNoteMutation(): UseMutationResult<void, Error, ContextNoteChange> {
  const { api, t, notify } = useClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, input }: ContextNoteChange) => {
      if (!input) {
        await api.moderation.removeContextNote(postId)

        return
      }

      await api.moderation.setContextNote({ postId, input })
    },
    onSuccess: () => notify.success(t("web.moderation.contextSaved")),
    onError: (error) => notify.error(errorMessage({ error, t })),
    onSettled: () => queryClient.invalidateQueries(),
  })
}
