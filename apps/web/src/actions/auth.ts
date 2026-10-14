"use server"

import {
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
  registerInputSchema,
  type LoginInput,
  type LoginTwoFactorInput,
  type RegisterInput,
} from "@contraponha/validation"
import { redirect } from "next/navigation"

import { createServerApiClient } from "@/lib/api"

export interface ActionSuccess {
  ok: true
}

export type ActionResult = ActionSuccess | ActionFailure

export interface SignInResult extends ActionSuccess {
  isOnboarded: boolean
}

// The password was right and the account has two-step verification: ask for the code.
export interface TwoFactorStep extends ActionSuccess {
  challengeToken: string
}

async function startSession(auth: AuthResponse): Promise<void> {
  await storeSession({ token: auth.session.token, expiresAt: auth.session.expiresAt })

  await storeLocale(auth.user.locale)
}

export async function signIn(
  input: LoginInput,
): Promise<SignInResult | TwoFactorStep | ActionFailure> {
  const parsed = loginInputSchema.parse(input)
  const locale = await getRequestLocale()

  try {
    const result = await createServerApiClient(locale).auth.login(parsed)

    if (isTwoFactorChallenge(result)) return { ok: true, challengeToken: result.challengeToken }

    await startSession(result)

    return { ok: true, isOnboarded: result.user.isOnboarded }
  } catch (error) {
    return toActionFailure(error)
  }
}

export async function completeTwoFactorSignIn(
  input: LoginTwoFactorInput,
): Promise<SignInResult | ActionFailure> {
  const parsed = loginTwoFactorInputSchema.parse(input)
  const locale = await getRequestLocale()

  try {
    const auth = await createServerApiClient(locale).auth.loginTwoFactor(parsed)

    await startSession(auth)

    return { ok: true, isOnboarded: auth.user.isOnboarded }
  } catch (error) {
    return toActionFailure(error)
  }
}

export async function signUp(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerInputSchema.parse(input)
  const locale = await getRequestLocale()

  try {
    const auth = await createServerApiClient(locale).auth.register({ ...parsed, locale })

    await startSession(auth)

    return { ok: true }
  } catch (error) {
    return toActionFailure(error)
  }
}

export async function signOut(): Promise<void> {
  const locale = await getRequestLocale()

  await endSession(createServerApiClient(locale))

  redirect("/")
}
