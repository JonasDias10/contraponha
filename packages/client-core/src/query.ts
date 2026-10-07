import { ApiError } from "@contraponha/api-client"

const MAX_RETRIES = 2

// Client errors (4xx) will not fix themselves; only network failures and 5xx are retried.
// TanStack Query calls retry with (failureCount, error), so the signature is fixed.
// eslint-disable-next-line no-restricted-syntax
export function isRetryable(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false

  return failureCount < MAX_RETRIES
}
