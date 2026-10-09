import { createApiClient, type ApiClient } from "@contraponha/api-client"
import type { Locale } from "@contraponha/i18n"

// Browser calls go to this app's /api/v1 proxy, which adds the session from the cookie.
export function createBrowserApiClient(locale: Locale): ApiClient {
  return createApiClient({ baseUrl: "", locale })
}
