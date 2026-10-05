import { createTranslator, negotiateLocale, type Locale, type Translate } from "@ponto/i18n"
import { useLocales } from "expo-localization"

export function useTranslator(): { locale: Locale; t: Translate } {
  const deviceLocales = useLocales()
  const locale = negotiateLocale(deviceLocales.map(({ languageTag }) => languageTag).join(","))
  return { locale, t: createTranslator(locale) }
}
