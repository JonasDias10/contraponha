"use client"

import { errorMessage } from "@contraponha/client-core"
import type { MessageKey } from "@contraponha/i18n"
import type { AdminUserDetail, UserRole } from "@contraponha/types"
import type { SuspendUserInput } from "@contraponha/validation"
import { useApi, useI18n } from "@contraponha/web-ui"
import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query"
import { toast } from "sonner"

import { hubQueryKeys } from "@/lib/query-keys"

export interface UserActions {
  suspend: UseMutationResult<AdminUserDetail, Error, SuspendUserInput>
  lift: UseMutationResult<AdminUserDetail, Error, void>
  removePhoto: UseMutationResult<AdminUserDetail, Error, void>
  changeRole: UseMutationResult<void, Error, UserRole>
}

// Every action answers with the updated account, which replaces the cached detail; lists
// are refetched because status and role filters may no longer match.
export function useUserActions(handle: string): UserActions {
  const api = useApi()
  const { t } = useI18n()
  const queryClient = useQueryClient()

  const handleUpdated = (successKey: MessageKey) => async (detail: AdminUserDetail) => {
    queryClient.setQueryData(hubQueryKeys.user(handle), detail)

    toast.success(t(successKey))

    await queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
  }

  const handleError = (error: Error): void => {
    toast.error(errorMessage({ error, t }))
  }

  return {
    suspend: useMutation({
      mutationFn: (input: SuspendUserInput) => api.admin.suspendUser({ handle, input }),
      onSuccess: handleUpdated("hub.user.suspended"),
      onError: handleError,
    }),
    lift: useMutation({
      mutationFn: () => api.admin.liftSuspension(handle),
      onSuccess: handleUpdated("hub.user.lifted"),
      onError: handleError,
    }),
    removePhoto: useMutation({
      mutationFn: () => api.admin.removeAvatar(handle),
      onSuccess: handleUpdated("hub.user.photoRemoved"),
      onError: handleError,
    }),
    changeRole: useMutation({
      mutationFn: (role: UserRole) => api.moderation.changeRole({ handle, input: { role } }),
      onSuccess: async () => {
        toast.success(t("hub.user.roleSaved"))

        await queryClient.invalidateQueries({ queryKey: ["admin"] })
      },
      onError: handleError,
    }),
  }
}
