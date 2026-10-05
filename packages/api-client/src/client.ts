import { createHttpClient, type HttpClientOptions } from "./http.js"
import { createAuthResource, type AuthResource } from "./resources/auth.js"
import { createHealthResource, type HealthResource } from "./resources/health.js"
import { createUsersResource, type UsersResource } from "./resources/users.js"

export type ApiClientOptions = HttpClientOptions

export interface ApiClient {
  auth: AuthResource
  health: HealthResource
  users: UsersResource
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const request = createHttpClient(options)

  return {
    auth: createAuthResource(request),
    health: createHealthResource(request),
    users: createUsersResource(request),
  }
}
