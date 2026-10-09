"use client"

import { useQuery } from "@tanstack/react-query"
import { handleSchema } from "@contraponha/validation"

import type { HandleAvailabilityState } from "../handle-field.js"
import { queryKeys } from "../query-keys.js"
import { useClient } from "./client-context.js"
import { useDebouncedValue } from "./use-debounced-value.js"

const CHECK_DELAY_MS = 400
const RESULT_STALE_MS = 60_000

function normalizeHandle(handle: string): string {
  const parsed = handleSchema.safeParse(handle)

  return parsed.success ? parsed.data : ""
}

// Malformed handles and failed checks stay idle: the form's own validation and the
// server's uniqueness check on submit still apply.
export function useHandleAvailability(handle: string): HandleAvailabilityState {
  const { api } = useClient()
  const candidate = normalizeHandle(handle)
  const debounced = useDebouncedValue({ value: candidate, delayMs: CHECK_DELAY_MS })

  const { data, isError } = useQuery({
    queryKey: queryKeys.handleAvailability(debounced),
    queryFn: () => api.auth.handleAvailability(debounced),
    enabled: debounced !== "",
    staleTime: RESULT_STALE_MS,
    retry: false,
  })

  if (candidate === "" || isError) return { status: "idle", handle: candidate }

  if (candidate !== debounced || !data) return { status: "checking", handle: candidate }

  return { status: data.isAvailable ? "available" : "taken", handle: candidate }
}
