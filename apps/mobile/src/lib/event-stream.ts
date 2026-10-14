import type { OpenStream } from "@contraponha/client-core/react"
import EventSource from "react-native-sse"

import { getMobileEnv } from "@/lib/env"
import { getSessionToken } from "@/lib/session-token"

// React Native has no EventSource; react-native-sse speaks the same protocol over XHR and
// lets the session token go in a header. It reconnects after drops.
export const openStream: OpenStream = ({ path, onMessage }) => {
  const token = getSessionToken()

  if (!token) return () => undefined

  const source = new EventSource(`${getMobileEnv().EXPO_PUBLIC_API_URL}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    pollingInterval: 5000,
  })

  source.addEventListener("message", (event) => {
    if (event.data) onMessage(event.data)
  })

  return () => source.close()
}
