"use server"

import { isLocale } from "@contraponha/i18n"

import { createServerApiClient } from "@/lib/api"
import { storeLocale } from "@/lib/i18n"
import { getSessionToken } from "@/lib/session"

// Remembers the language in a cookie and, when signed in, in the account (emails follow it).
export async function changeLocale(locale: string): Promise<void> {
  if (!isLocale(locale)) return

  await storeLocale(locale)

  const token = await getSessionToken()

  if (token) await createServerApiClient(locale).users.updateMe({ locale })
}
