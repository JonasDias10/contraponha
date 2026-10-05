import { createApiClient, type ApiClient } from "@ponto/api-client"
import type { Locale } from "@ponto/i18n"

import { getWebEnv } from "./env"

export function createServerApiClient(locale: Locale): ApiClient {
  return createApiClient({ baseUrl: getWebEnv().API_URL, locale })
}
