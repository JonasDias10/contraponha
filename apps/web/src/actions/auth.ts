"use server"

import { ApiError } from "@contraponha/api-client"
import type { AuthResponse, ValidationIssue } from "@contraponha/types"
import {
  loginInputSchema,
  registerInputSchema,
  type LoginInput,
  type RegisterInput,
} from "@contraponha/validation"
import { redirect } from "next/navigation"

import { createServerApiClient } from "@/lib/api"
import { getRequestLocale, storeLocale } from "@/lib/i18n"
import { clearSession, storeSession } from "@/lib/session"

export interface ActionFailure {
  ok: false
  message: string
  issues: ValidationIssue[]
}

export interface ActionSuccess {
  ok: true
}

export type ActionResult = ActionSuccess | ActionFailure

export interface SignInResult extends ActionSuccess {
  isOnboarded: boolean
}

function failure(error: unknown): ActionFailure {
  if (error instanceof ApiError) {
    const issues = Array.isArray(error.details)
      ? error.details.filter(
          (issue): issue is ValidationIssue =>
            typeof issue === "object" && issue !== null && "path" in issue,
        )
      : []

    return { ok: false, message: error.message, issues }
  }

  throw error
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
    return failure(error)
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
    return failure(error)
  }
}

export async function signOut(): Promise<void> {
  const locale = await getRequestLocale()

  try {
    await createServerApiClient(locale).auth.logout()
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
  } finally {
    await clearSession()
  }

  redirect("/")
}
