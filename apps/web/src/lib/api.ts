import "server-only"

import { createApiClient, type ApiClient } from "@ponto/api-client"
import type { Locale } from "@ponto/i18n"

import { getWebEnv } from "./env"
import { getSessionToken } from "./session"

// API client for server components and server actions, signed in with the session cookie.
export function createServerApiClient(locale: Locale): ApiClient {
  return createApiClient({ baseUrl: getWebEnv().API_URL, locale, getSessionToken })
}
