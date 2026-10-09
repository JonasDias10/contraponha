import "server-only"

import type { ApiClient } from "@contraponha/api-client"
import type { Locale } from "@contraponha/i18n"
import { createServerApiClient as createClient } from "@contraponha/next-server"

import { getHubEnv } from "./env"

export function createServerApiClient(locale: Locale): ApiClient {
  return createClient({ apiUrl: getHubEnv().API_URL, locale })
}
