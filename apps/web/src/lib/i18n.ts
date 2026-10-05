import { createTranslator, negotiateLocale, type Locale, type Translate } from "@ponto/i18n"
import { headers } from "next/headers"

export async function getRequestLocale(): Promise<Locale> {
  const requestHeaders = await headers()
  return negotiateLocale({ acceptLanguage: requestHeaders.get("accept-language") })
}

export async function getRequestTranslator(): Promise<{ locale: Locale; t: Translate }> {
  const locale = await getRequestLocale()
  return { locale, t: createTranslator({ locale }) }
}
