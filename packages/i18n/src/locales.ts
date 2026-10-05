export const SUPPORTED_LOCALES = ["pt-BR", "en", "es"] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = "pt-BR"

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}
