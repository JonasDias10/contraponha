import { ClientContext } from "@contraponha/client-core/react"
import { useMemo } from "react"

import { openStream } from "@/lib/event-stream"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"

interface ClientBridgeProps {
  children: React.ReactNode
}

export function ClientBridge({ children }: ClientBridgeProps): React.JSX.Element {
  const api = useApi()
  const { t } = useI18n()
  const toast = useToast()
  const value = useMemo(() => ({ api, t, notify: toast, openStream }), [api, t, toast])

  return <ClientContext value={value}>{children}</ClientContext>
}
