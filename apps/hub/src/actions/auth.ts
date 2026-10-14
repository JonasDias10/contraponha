"use server"

import { canModerate } from "@contraponha/client-core"
import { createTranslator } from "@contraponha/i18n"
import {
  createServerApiClient as createClient,
  endSession,
  getRequestLocale,
  storeLocale,
  storeSession,
  toActionFailure,
  type ActionFailure,
} from "@contraponha/next-server"
import type { AuthResponse } from "@contraponha/types"
import {
  isTwoFactorChallenge,
  loginInputSchema,
  loginTwoFactorInputSchema,
  type LoginInput,
  type LoginTwoFactorInput,
} from "@contraponha/validation"
import { redirect } from "next/navigation"

import { createServerApiClient } from "@/lib/api"
import { getHubEnv } from "@/lib/env"

export interface SignInSuccess {
  ok: true
}

export interface TwoFactorStep {
  ok: true
  challengeToken: string
}

// Members can sign in to the app but not here: their new session is ended right away so
// the hub never holds a session it cannot use.
async function keepStaffSession(auth: AuthResponse): Promise<SignInSuccess | ActionFailure> {
  const locale = await getRequestLocale()

  if (!canModerate(auth.user)) {
    const apiUrl = getHubEnv().API_URL

    await createClient({ apiUrl, locale, sessionToken: auth.session.token }).auth.logout()

    const t = createTranslator({ locale })

    return { ok: false, code: "FORBIDDEN", message: t("hub.login.notStaff"), issues: [] }
  }

  await storeSession({ token: auth.session.token, expiresAt: auth.session.expiresAt })

  await storeLocale(auth.user.locale)

  return { ok: true }
}

export async function signIn(
  input: LoginInput,
): Promise<SignInSuccess | TwoFactorStep | ActionFailure> {
  const parsed = loginInputSchema.parse(input)
  const locale = await getRequestLocale()

  try {
    const result = await createServerApiClient(locale).auth.login(parsed)

    if (isTwoFactorChallenge(result)) return { ok: true, challengeToken: result.challengeToken }

    return await keepStaffSession(result)
  } catch (error) {
    return toActionFailure(error)
  }
}

export async function completeTwoFactorSignIn(
  input: LoginTwoFactorInput,
): Promise<SignInSuccess | ActionFailure> {
  const parsed = loginTwoFactorInputSchema.parse(input)
  const locale = await getRequestLocale()

  try {
    const auth = await createServerApiClient(locale).auth.loginTwoFactor(parsed)

    return await keepStaffSession(auth)
  } catch (error) {
    return toActionFailure(error)
  }
}

export async function signOut(): Promise<void> {
  const locale = await getRequestLocale()

  await endSession(createServerApiClient(locale))

  redirect("/login")
}
