"use client"

import type { CommunityRule } from "@ponto/types"
import type { ContextNoteInput } from "@ponto/validation"
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"
import { toast } from "sonner"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { errorMessage } from "@/lib/api-errors"

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
  const api = useApi()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ targetType, targetId, rule }: RemoveContentChange) =>
      targetType === "post"
        ? api.moderation.removePost({ targetId, input: { rule } })
        : api.moderation.removeComment({ targetId, input: { rule } }),
    onSuccess: () => toast.success(t("web.moderation.removed")),
    onError: (error) => toast.error(errorMessage({ error, t })),
    onSettled: () => queryClient.invalidateQueries(),
  })
}

export function useContextNoteMutation(): UseMutationResult<void, Error, ContextNoteChange> {
  const api = useApi()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, input }: ContextNoteChange) => {
      if (!input) {
        await api.moderation.removeContextNote(postId)

        return
      }

      await api.moderation.setContextNote({ postId, input })
    },
    onSuccess: () => toast.success(t("web.moderation.contextSaved")),
    onError: (error) => toast.error(errorMessage({ error, t })),
    onSettled: () => queryClient.invalidateQueries(),
  })
}
