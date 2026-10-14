"use client"

import type { RecoveryCodes, TwoFactorSetup, TwoFactorStatus } from "@contraponha/types"
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query"

import { errorMessage } from "../api-errors.js"
import { queryKeys } from "../query-keys.js"
import { useClient } from "./client-context.js"

export interface TwoFactorCode {
  code: string
}

export interface TwoFactorSettings {
  status: TwoFactorStatus | undefined
  setup: UseMutationResult<TwoFactorSetup, Error, void>
  enable: UseMutationResult<RecoveryCodes, Error, TwoFactorCode>
  disable: UseMutationResult<void, Error, TwoFactorCode>
  regenerate: UseMutationResult<RecoveryCodes, Error, TwoFactorCode>
}

// Settings screen for two-step verification, the same on web and mobile.
export function useTwoFactorSettings(): TwoFactorSettings {
  const { api, t, notify } = useClient()
  const queryClient = useQueryClient()

  const { data: status } = useQuery({
    queryKey: queryKeys.twoFactor,
    queryFn: () => api.auth.twoFactorStatus(),
  })

  const refresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.me })
  }

  const notifyError = (error: Error): void => notify.error(errorMessage({ error, t }))

  return {
    status,
    setup: useMutation({ mutationFn: () => api.auth.startTwoFactorSetup(), onError: notifyError }),
    enable: useMutation({
      mutationFn: ({ code }: TwoFactorCode) => api.auth.enableTwoFactor({ code }),
      onSuccess: async () => {
        notify.success(t("web.twoFactor.enabled"))

        await refresh()
      },
      onError: notifyError,
    }),
    disable: useMutation({
      mutationFn: ({ code }: TwoFactorCode) => api.auth.disableTwoFactor({ code }),
      onSuccess: async () => {
        notify.success(t("web.twoFactor.disabled"))

        await refresh()
      },
      onError: notifyError,
    }),
    regenerate: useMutation({
      mutationFn: ({ code }: TwoFactorCode) => api.auth.regenerateRecoveryCodes({ code }),
      onSuccess: refresh,
      onError: notifyError,
    }),
  }
}
