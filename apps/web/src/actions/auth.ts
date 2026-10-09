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
  loginInputSchema,
  registerInputSchema,
  type LoginInput,
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

async function startSession(auth: AuthResponse): Promise<void> {
  await storeSession({ token: auth.session.token, expiresAt: auth.session.expiresAt })

  await storeLocale(auth.user.locale)
}

export async function signIn(input: LoginInput): Promise<SignInResult | ActionFailure> {
  const parsed = loginInputSchema.parse(input)
  const locale = await getRequestLocale()

  try {
    const auth = await createServerApiClient(locale).auth.login(parsed)

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
