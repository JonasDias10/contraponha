import { isLocale, type Locale } from "@contraponha/i18n"
import { createContext, useContext, useEffect, useMemo, useState } from "react"

import { readStored, STORAGE_KEYS, writeStored } from "@/lib/storage"

export type ThemePreference = "system" | "light" | "dark"

interface PreferencesContextValue {
  theme: ThemePreference
  locale: Locale | null
  isLoaded: boolean
  setTheme: (theme: ThemePreference) => void
  setLocale: (locale: Locale | null) => void
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null)

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark"
}

interface PreferencesProviderProps {
  children: React.ReactNode
}

export function PreferencesProvider({ children }: PreferencesProviderProps): React.JSX.Element {
  const [theme, setThemeState] = useState<ThemePreference>("system")
  const [locale, setLocaleState] = useState<Locale | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    void Promise.all([readStored(STORAGE_KEYS.theme), readStored(STORAGE_KEYS.locale)]).then(
      ([storedTheme, storedLocale]) => {
        if (isThemePreference(storedTheme)) setThemeState(storedTheme)

        if (storedLocale && isLocale(storedLocale)) setLocaleState(storedLocale)

        setIsLoaded(true)
      },
    )
  }, [])

  const value = useMemo<PreferencesContextValue>(
    () => ({
      theme,
      locale,
      isLoaded,
      setTheme: (next) => {
        setThemeState(next)

        void writeStored({ key: STORAGE_KEYS.theme, value: next })
      },
      setLocale: (next) => {
        setLocaleState(next)

        void writeStored({ key: STORAGE_KEYS.locale, value: next })
      },
    }),
    [theme, locale, isLoaded],
  )

  return <PreferencesContext value={value}>{children}</PreferencesContext>
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext)

  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider")

  return value
}
