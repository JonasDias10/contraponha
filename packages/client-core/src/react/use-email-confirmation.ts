"use client"

import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import { useClient } from "./client-context.js"

// Tokens are single-use: a query keyed by the token runs exactly once, even when React
// mounts the screen twice in development. It resolves to true because React Query does not
// accept undefined as query data.
export function useEmailConfirmation(token: string | undefined): UseQueryResult<true> {
  const { api } = useClient()

  return useQuery({
    queryKey: ["email-verification", token],
    queryFn: async () => {
      await api.auth.confirmEmail({ token: token ?? "" })

      return true as const
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })
}
