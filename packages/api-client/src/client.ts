import { createHttpClient, type HttpClientOptions } from "./http.js"
import { createHealthResource, type HealthResource } from "./resources/health.js"

export type ApiClientOptions = HttpClientOptions

export interface ApiClient {
  health: HealthResource
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const request = createHttpClient(options)

  return {
    health: createHealthResource(request),
  }
}
