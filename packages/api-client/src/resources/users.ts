import type {
  FollowedByPreview,
  PrivateProfile,
  ProfileView,
  SuggestedPeople,
} from "@contraponha/types"
import {
  followedByPreviewSchema,
  privateProfileSchema,
  profileViewSchema,
  suggestedPeopleSchema,
  type UpdateProfileInput,
} from "@contraponha/validation"

import type { HttpClient } from "../http.js"

export interface UsersResource {
  me(): Promise<PrivateProfile>
  updateMe(input: UpdateProfileInput): Promise<PrivateProfile>
  completeOnboarding(): Promise<PrivateProfile>
  getByHandle(handle: string): Promise<ProfileView>
  followedBy(handle: string): Promise<FollowedByPreview>
  suggestions(): Promise<SuggestedPeople>
}

export function createUsersResource(request: HttpClient): UsersResource {
  return {
    me: () => request({ method: "GET", path: "/users/me", schema: privateProfileSchema }),
    updateMe: (input) =>
      request({ method: "PATCH", path: "/users/me", body: input, schema: privateProfileSchema }),
    completeOnboarding: () =>
      request({ method: "POST", path: "/users/me/onboarding", schema: privateProfileSchema }),
    getByHandle: (handle) =>
      request({
        method: "GET",
        path: `/users/${encodeURIComponent(handle)}`,
        schema: profileViewSchema,
      }),
    followedBy: (handle) =>
      request({
        method: "GET",
        path: `/users/${encodeURIComponent(handle)}/followed-by`,
        schema: followedByPreviewSchema,
      }),
    suggestions: () =>
      request({ method: "GET", path: "/people/suggestions", schema: suggestedPeopleSchema }),
  }
}
