import { createApiClient, type ApiClient } from "@contraponha/api-client"
import type { Locale } from "@contraponha/i18n"

import { getMobileEnv } from "./env"

export function createMobileApiClient(locale: Locale): ApiClient {
  return createApiClient({ baseUrl: getMobileEnv().EXPO_PUBLIC_API_URL, locale })
}
