"use client"

import type { NotificationPreferences } from "@contraponha/types"
import type { UpdateNotificationPreferencesInput } from "@contraponha/validation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { errorMessage } from "../api-errors.js"
import { queryKeys } from "../query-keys.js"
import { useClient } from "./client-context.js"

export interface NotificationPreferencesState {
  preferences: NotificationPreferences | undefined
  save: (input: UpdateNotificationPreferencesInput) => void
}

// Switches respond at once; a failed save puts back what the server last said.
export function useNotificationPreferences(): NotificationPreferencesState {
  const { api, t, notify } = useClient()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => api.notifications.getPreferences(),
  })

  const mutation = useMutation({
    mutationFn: (input: UpdateNotificationPreferencesInput) =>
      api.notifications.updatePreferences(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notificationPreferences })

      const previous = queryClient.getQueryData<NotificationPreferences>(
        queryKeys.notificationPreferences,
      )

      if (previous)
        queryClient.setQueryData(queryKeys.notificationPreferences, { ...previous, ...input })

      return { previous }
    },
    onError: (error, _input, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKeys.notificationPreferences, context.previous)

      notify.error(errorMessage({ error, t }))
    },
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.notificationPreferences, saved),
  })

  return { preferences: data, save: (input) => mutation.mutate(input) }
}
