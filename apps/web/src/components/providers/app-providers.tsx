"use client"

import type { ApiClient } from "@contraponha/api-client"
import type { Locale } from "@contraponha/i18n"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createContext, useContext, useState } from "react"
import { Toaster } from "sonner"

import { createBrowserApiClient } from "@/lib/api-browser"
import { isRetryable } from "@/lib/query"

import { I18nProvider } from "./i18n-provider"

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
          {children}
          <Toaster position="bottom-center" toastOptions={{ duration: 4000 }} />
        </QueryClientProvider>
      </ApiContext>
    </I18nProvider>
  )
}

export function useApi(): ApiClient {
  const api = useContext(ApiContext)

  if (!api) throw new Error("useApi must be used inside AppProviders")

  return api
}
