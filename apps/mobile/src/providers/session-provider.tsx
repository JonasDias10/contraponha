import { createApiClient, type ApiClient } from "@contraponha/api-client"
import { queryKeys } from "@contraponha/client-core"
import { negotiateLocale, type Locale } from "@contraponha/i18n"
import type { AuthResponse, PrivateProfile } from "@contraponha/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocales } from "expo-localization"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import { getMobileEnv } from "@/lib/env"
import { getSessionToken, setSessionToken } from "@/lib/session-token"
import { readStored, STORAGE_KEYS, writeStored } from "@/lib/storage"
import { usePreferences } from "@/providers/preferences-provider"

interface SessionContextValue {
  api: ApiClient
  requestLocale: Locale
  isSignedIn: boolean
  isRestoring: boolean
  signIn: (auth: AuthResponse) => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

function useDeviceLocale(): Locale {
  const deviceLocales = useLocales()
  const acceptLanguage = deviceLocales.map(({ languageTag }) => languageTag).join(",")

  return negotiateLocale({ acceptLanguage })
}

interface SessionProviderProps {
  children: React.ReactNode
}

export function SessionProvider({ children }: SessionProviderProps): React.JSX.Element {
  const queryClient = useQueryClient()
  const preferences = usePreferences()
  const deviceLocale = useDeviceLocale()
  const requestLocale = preferences.locale ?? deviceLocale
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isRestoring, setIsRestoring] = useState(true)

  const clearLocalSession = useCallback(async (): Promise<void> => {
    setSessionToken(null)

    setIsSignedIn(false)

    queryClient.clear()

    await writeStored({ key: STORAGE_KEYS.sessionToken, value: null })
  }, [queryClient])

  useEffect(() => {
    void readStored(STORAGE_KEYS.sessionToken).then((token) => {
      setSessionToken(token)

      setIsSignedIn(Boolean(token))

      setIsRestoring(false)
    })
  }, [])

  const api = useMemo(() => {
    // An expired or revoked session answers 401; drop it so the app returns to sign in.
    // The signature is fetch's own, so it keeps two positional parameters.
    // eslint-disable-next-line no-restricted-syntax
    const fetchWithSession: typeof fetch = async (input, init) => {
      const sentWithToken = getSessionToken() !== null
      const response = await fetch(input, init)

      if (response.status === 401 && sentWithToken) void clearLocalSession()

      return response
    }

    return createApiClient({
      baseUrl: getMobileEnv().EXPO_PUBLIC_API_URL,
      locale: requestLocale,
      fetch: fetchWithSession,
      getSessionToken,
    })
  }, [requestLocale, clearLocalSession])

  const signIn = useCallback(
    async (auth: AuthResponse): Promise<void> => {
      setSessionToken(auth.session.token)

      queryClient.setQueryData(queryKeys.me, auth.user)

      await writeStored({ key: STORAGE_KEYS.sessionToken, value: auth.session.token })

      setIsSignedIn(true)
    },
    [queryClient],
  )

  const signOut = useCallback(async (): Promise<void> => {
    try {
      await api.auth.logout()
    } catch {
      // The local session is cleared even when the server is unreachable.
    } finally {
      await clearLocalSession()
    }
  }, [api, clearLocalSession])

  const value = useMemo<SessionContextValue>(
    () => ({ api, requestLocale, isSignedIn, isRestoring, signIn, signOut }),
    [api, requestLocale, isSignedIn, isRestoring, signIn, signOut],
  )

  return <SessionContext value={value}>{children}</SessionContext>
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)

  if (!value) throw new Error("useSession must be used inside SessionProvider")

  return value
}

export function useApi(): ApiClient {
  return useSession().api
}

interface ViewerState {
  viewer: PrivateProfile | null
  isLoading: boolean
}

export function useViewerQuery(): ViewerState {
  const { api, isSignedIn } = useSession()

  const query = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.users.me(),
    enabled: isSignedIn,
  })

  return {
    viewer: isSignedIn ? (query.data ?? null) : null,
    isLoading: isSignedIn && query.isPending,
  }
}

export function useViewer(): PrivateProfile | null {
  return useViewerQuery().viewer
}

export function useRequiredViewer(): PrivateProfile {
  const viewer = useViewer()

  if (!viewer) throw new Error("useRequiredViewer needs a signed-in viewer")

  return viewer
}
