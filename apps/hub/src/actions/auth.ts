"use server"

import { canModerate } from "@contraponha/client-core"
import { createTranslator } from "@contraponha/i18n"
import {
  createServerApiClient as createClient,
  getRequestLocale,
  storeLocale,
  storeSession,
  endSession,
  toActionFailure,
  type ActionFailure,
} from "@contraponha/next-server"
import { loginInputSchema, type LoginInput } from "@contraponha/validation"
import { redirect } from "next/navigation"

import { createServerApiClient } from "@/lib/api"
import { getHubEnv } from "@/lib/env"

export interface SignInSuccess {
  ok: true
}

// Members can sign in to the app but not here: their new session is ended right away so
// the hub never holds a session it cannot use.
export async function signIn(input: LoginInput): Promise<SignInSuccess | ActionFailure> {
  const parsed = loginInputSchema.parse(input)
  const locale = await getRequestLocale()

  try {
    const auth = await createServerApiClient(locale).auth.login(parsed)

    if (!canModerate(auth.user)) {
      const apiUrl = getHubEnv().API_URL

      await createClient({ apiUrl, locale, sessionToken: auth.session.token }).auth.logout()

      const t = createTranslator({ locale })

      return { ok: false, code: "FORBIDDEN", message: t("hub.login.notStaff"), issues: [] }
    }

    await storeSession({ token: auth.session.token, expiresAt: auth.session.expiresAt })

    await storeLocale(auth.user.locale)

    return { ok: true }
  } catch (error) {
    return toActionFailure(error)
  }
}

export async function signOut(): Promise<void> {
  const locale = await getRequestLocale()

  await endSession(createServerApiClient(locale))

  redirect("/login")
}
