"use client"

import type { MessageKey } from "@contraponha/i18n"
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"

import { errorMessage } from "../api-errors.js"
import { useClient } from "./client-context.js"

export type RelationKind = "block" | "mute"

export interface RelationChange {
  handle: string
  kind: RelationKind
  isOn: boolean
}

const SUCCESS: Record<RelationKind, Record<"on" | "off", MessageKey>> = {
  block: { on: "web.relations.blocked", off: "web.relations.unblocked" },
  mute: { on: "web.relations.muted", off: "web.relations.unmuted" },
}

// Blocking and muting change what every list shows, so feeds, comments, search and
// notifications are all refetched afterwards.
export function useRelationMutation(): UseMutationResult<void, Error, RelationChange> {
  const { api, t, notify } = useClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ handle, kind, isOn }: RelationChange) => {
      if (kind === "block")
        return isOn ? api.relations.block(handle) : api.relations.unblock(handle)

      return isOn ? api.relations.mute(handle) : api.relations.unmute(handle)
    },
    onSuccess: (_data, { kind, isOn }) => notify.success(t(SUCCESS[kind][isOn ? "on" : "off"])),
    onError: (error) => notify.error(errorMessage({ error, t })),
    onSettled: () => queryClient.invalidateQueries(),
  })
}
