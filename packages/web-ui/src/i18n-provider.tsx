"use client"

import { createTranslator, type Locale, type Translate } from "@contraponha/i18n"
import { createContext, useContext, useMemo } from "react"

interface I18nContextValue {
  locale: Locale
  t: Translate
}

const I18nContext = createContext<I18nContextValue | null>(null)

interface I18nProviderProps {
  locale: Locale
  children: React.ReactNode
}

export function I18nProvider({ locale, children }: I18nProviderProps): React.JSX.Element {
  const value = useMemo(() => ({ locale, t: createTranslator({ locale }) }), [locale])

  return <I18nContext value={value}>{children}</I18nContext>
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext)

  if (!value) throw new Error("useI18n must be used inside I18nProvider")

  return value
}
