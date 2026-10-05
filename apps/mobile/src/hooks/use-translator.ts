import { createTranslator, negotiateLocale, type LocaleTranslator } from "@ponto/i18n"
import { useLocales } from "expo-localization"

export function useTranslator(): LocaleTranslator {
  const deviceLocales = useLocales()
  const acceptLanguage = deviceLocales.map(({ languageTag }) => languageTag).join(",")
  const locale = negotiateLocale({ acceptLanguage })
  return { locale, t: createTranslator({ locale }) }
}
