"use client"

import type { ApiClient } from "@contraponha/api-client"
import type { Locale } from "@contraponha/i18n"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createContext, useContext, useMemo, useState } from "react"
import { isRetryable } from "@contraponha/client-core"
import { ClientContext, type OpenStream } from "@contraponha/client-core/react"
import { toast, Toaster } from "sonner"

import { createBrowserApiClient } from "./api-browser.js"
import { I18nProvider, useI18n } from "./i18n-provider.js"

const ApiContext = createContext<ApiClient | null>(null)

const STALE_TIME_MS = 30_000

interface AppProvidersProps {
  locale: Locale
  children: React.ReactNode
}

export function AppProviders({ locale, children }: AppProvidersProps): React.JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: STALE_TIME_MS, retry: isRetryable, refetchOnWindowFocus: false },
        },
      }),
  )

  const [api] = useState(() => createBrowserApiClient(locale))

  return (
    <I18nProvider locale={locale}>
      <ApiContext value={api}>
        <QueryClientProvider client={queryClient}>
          <ClientBridge api={api}>{children}</ClientBridge>
          <Toaster position="bottom-center" toastOptions={{ duration: 4000 }} />
        </QueryClientProvider>
      </ApiContext>
    </I18nProvider>
  )
}

const NOTIFY = {
  show: (message: string) => toast(message),
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
}

// Same-origin EventSource through the app's /api/v1 proxy, which adds the session cookie.
// The browser reconnects on its own after a drop.
const openStream: OpenStream = ({ path, onMessage }) => {
  const source = new EventSource(`/api/v1${path}`)

  source.onmessage = (message: MessageEvent<string>) => onMessage(message.data)

  return () => source.close()
}

interface ClientBridgeProps {
  api: ApiClient
  children: React.ReactNode
}

function ClientBridge({ api, children }: ClientBridgeProps): React.JSX.Element {
  const { t } = useI18n()
  const value = useMemo(() => ({ api, t, notify: NOTIFY, openStream }), [api, t])

  return <ClientContext value={value}>{children}</ClientContext>
}

export function useApi(): ApiClient {
  const api = useContext(ApiContext)

  if (!api) throw new Error("useApi must be used inside AppProviders")

  return api
}
