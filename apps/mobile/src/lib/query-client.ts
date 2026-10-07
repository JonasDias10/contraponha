import { isRetryable } from "@contraponha/client-core"
import { QueryClient } from "@tanstack/react-query"

const STALE_TIME_MS = 30_000

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: isRetryable, staleTime: STALE_TIME_MS },
      mutations: { retry: false },
    },
  })
}
