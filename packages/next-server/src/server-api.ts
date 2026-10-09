import "server-only"

import { ApiError, createApiClient, type ApiClient } from "@contraponha/api-client"
import type { Locale } from "@contraponha/i18n"
import type { PrivateProfile, ValidationIssue } from "@contraponha/types"

import { clearSession, getSessionToken } from "./session.js"

export interface ServerApiClientParams {
  apiUrl: string
  locale: Locale
  // Signs requests with this token instead of the session cookie.
  sessionToken?: string
}

// API client for server components and server actions, signed in with the session cookie.
export function createServerApiClient({
  apiUrl,
  locale,
  sessionToken,
}: ServerApiClientParams): ApiClient {
  return createApiClient({
    baseUrl: apiUrl,
    locale,
    getSessionToken: sessionToken ? () => sessionToken : getSessionToken,
  })
}

// Ends the session on the API and drops the cookie; the cookie goes even when the API
// cannot be reached, so signing out always works locally.
export async function endSession(api: ApiClient): Promise<void> {
  try {
    await api.auth.logout()
  } catch (error) {
    if (!(error instanceof ApiError)) throw error
  } finally {
    await clearSession()
  }
}

// The signed-in person, or null when there is no session or it is no longer valid. Apps wrap
// it in React's cache() so a request makes at most one call.
export async function fetchViewer(params: ServerApiClientParams): Promise<PrivateProfile | null> {
  const token = await getSessionToken()

  if (!token) return null

  try {
    const viewer = await createServerApiClient(params).users.me()

    return viewer
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null

    throw error
  }
}

export interface ActionFailure {
  ok: false
  code: string
  message: string
  issues: ValidationIssue[]
}

// Turns an API error into a result a server action can return to the form; anything else
// is a bug and is rethrown.
export function toActionFailure(error: unknown): ActionFailure {
  if (!(error instanceof ApiError)) throw error

  const issues = Array.isArray(error.details)
    ? error.details.filter(
        (issue): issue is ValidationIssue =>
          typeof issue === "object" && issue !== null && "path" in issue,
      )
    : []

  return { ok: false, code: error.code, message: error.message, issues }
}
