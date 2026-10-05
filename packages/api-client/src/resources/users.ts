import type { PrivateProfile, PublicProfile } from "@ponto/types"
import {
  privateProfileSchema,
  publicProfileSchema,
  type UpdateProfileInput,
} from "@ponto/validation"

import type { HttpClient } from "../http.js"

export interface UsersResource {
  me(): Promise<PrivateProfile>
  updateMe(input: UpdateProfileInput): Promise<PrivateProfile>
  getByHandle(handle: string): Promise<PublicProfile>
}

export function createUsersResource(request: HttpClient): UsersResource {
  return {
    me: () => request({ method: "GET", path: "/users/me", schema: privateProfileSchema }),
    updateMe: (input) =>
      request({ method: "PATCH", path: "/users/me", body: input, schema: privateProfileSchema }),
    getByHandle: (handle) =>
      request({
        method: "GET",
        path: `/users/${encodeURIComponent(handle)}`,
        schema: publicProfileSchema,
      }),
  }
}
