import { createTranslator, type Locale, type Translate } from "@contraponha/i18n"
import { createContext, useContext, useMemo } from "react"

import { usePreferences } from "@/providers/preferences-provider"
import { useSession, useViewer } from "@/providers/session-provider"

interface I18nContextValue {
  locale: Locale
  t: Translate
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  children: React.ReactNode
}

// The app's own choice wins, then the account's language, then the device's.
export function I18nProvider({ children }: I18nProviderProps): React.JSX.Element {
  const preferences = usePreferences()
  const { requestLocale } = useSession()
  const viewer = useViewer()
  const locale = preferences.locale ?? viewer?.locale ?? requestLocale

  const value = useMemo(() => ({ locale, t: createTranslator({ locale }) }), [locale])

  return <I18nContext value={value}>{children}</I18nContext>
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext)

  if (!value) throw new Error("useI18n must be used inside I18nProvider")

  return value
}
