"use client"

import type { ApiClient } from "@contraponha/api-client"
import type { Translate } from "@contraponha/i18n"
import { createContext, useContext } from "react"

export interface ClientNotifier {
  show: (message: string) => void
  success: (message: string) => void
  error: (message: string) => void
}

export interface OpenStreamParams {
  // API path without the /api/v1 prefix, for example "/events".
  path: string
  onMessage: (data: string) => void
}

// Opens a Server-Sent Events stream and returns a function that closes it. The platform
// owns the transport (EventSource on the web, react-native-sse on the phone) and reconnects.
export type OpenStream = (params: OpenStreamParams) => () => void

export interface ClientContextValue {
  api: ApiClient
  t: Translate
  notify: ClientNotifier
  openStream?: OpenStream
}

// Each app provides its own API client, translator and toast, so shared hooks stay platform-free.
export const ClientContext = createContext<ClientContextValue | null>(null)

export function useClient(): ClientContextValue {
  const value = useContext(ClientContext)

  if (!value) throw new Error("useClient must be used inside ClientContext")

  return value
}
