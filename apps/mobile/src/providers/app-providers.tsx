import { QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { createQueryClient } from "@/lib/query-client"
import { ClientBridge } from "@/providers/client-bridge"
import { I18nProvider } from "@/providers/i18n-provider"
import { PreferencesProvider } from "@/providers/preferences-provider"
import { SessionProvider } from "@/providers/session-provider"
import { ToastProvider } from "@/providers/toast-provider"

interface AppProvidersProps {
  children: React.ReactNode
}

export function AppProviders({ children }: AppProvidersProps): React.JSX.Element {
  const [queryClient] = useState(createQueryClient)

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PreferencesProvider>
          <SessionProvider>
            <I18nProvider>
              <ToastProvider>
                <ClientBridge>{children}</ClientBridge>
              </ToastProvider>
            </I18nProvider>
          </SessionProvider>
        </PreferencesProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
