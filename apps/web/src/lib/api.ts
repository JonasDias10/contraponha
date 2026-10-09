import "server-only"

import type { ApiClient } from "@contraponha/api-client"
import type { Locale } from "@contraponha/i18n"
import { createServerApiClient as createClient } from "@contraponha/next-server"

import { getWebEnv } from "./env"

export function createServerApiClient(locale: Locale): ApiClient {
  return createClient({ apiUrl: getWebEnv().API_URL, locale })
}
