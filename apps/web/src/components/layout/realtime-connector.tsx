"use client"

import { useRealtimeStream } from "@contraponha/client-core/react"

export interface RealtimeConnectorProps {
  isSignedIn: boolean
}

// Lives in the (app) layout, which persists across navigation, so one event stream stays
// open while the person moves between pages.
export function RealtimeConnector({ isSignedIn }: RealtimeConnectorProps): null {
  useRealtimeStream(isSignedIn)

  return null
}
