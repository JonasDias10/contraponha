import "server-only"

import {
  createTranslator,
  isLocale,
  negotiateLocale,
  type Locale,
  type LocaleTranslator,
} from "@contraponha/i18n"
import { cookies, headers } from "next/headers.js"

export const LOCALE_COOKIE = "contraponha_locale"

// An explicit choice (language switcher or the account's language) wins over the browser's.
export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const chosen = cookieStore.get(LOCALE_COOKIE)?.value

  if (chosen && isLocale(chosen)) return chosen

  const requestHeaders = await headers()
  return negotiateLocale({ acceptLanguage: requestHeaders.get("accept-language") })
}

export async function getRequestTranslator(): Promise<LocaleTranslator> {
  const locale = await getRequestLocale()
  return { locale, t: createTranslator({ locale }) }
}

export async function storeLocale(locale: Locale): Promise<void> {
  const cookieStore = await cookies()

  cookieStore.set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 })
}
