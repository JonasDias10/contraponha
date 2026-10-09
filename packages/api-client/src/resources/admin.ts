import type {
  AdminMetrics,
  AdminTopic,
  AdminUserDetail,
  AdminUserSummary,
  Page,
} from "@contraponha/types"
import {
  adminMetricsSchema,
  adminTopicPageSchema,
  adminTopicSchema,
  adminUserDetailSchema,
  adminUserPageSchema,
  type AdminMetricsQuery,
  type AdminTopicListQuery,
  type AdminUserListQuery,
  type CreateTopicInput,
  type SuspendUserInput,
  type UpdateTopicInput,
} from "@contraponha/validation"

import { withQuery, type HttpClient } from "../http.js"

export interface SuspendUserRequest {
  handle: string
  input: SuspendUserInput
}

export interface UpdateTopicRequest {
  slug: string
  input: UpdateTopicInput
}

export interface AdminResource {
  listUsers(query?: AdminUserListQuery): Promise<Page<AdminUserSummary>>
  getUser(handle: string): Promise<AdminUserDetail>
  suspendUser(request: SuspendUserRequest): Promise<AdminUserDetail>
  liftSuspension(handle: string): Promise<AdminUserDetail>
  removeAvatar(handle: string): Promise<AdminUserDetail>
  metrics(query?: AdminMetricsQuery): Promise<AdminMetrics>
  listTopics(query?: AdminTopicListQuery): Promise<Page<AdminTopic>>
  createTopic(input: CreateTopicInput): Promise<AdminTopic>
  updateTopic(request: UpdateTopicRequest): Promise<AdminTopic>
}

function userPath(handle: string): string {
  return `/admin/users/${encodeURIComponent(handle)}`
}

// Back office routes used by the hub; every call needs a moderator or admin session.
export function createAdminResource(request: HttpClient): AdminResource {
  return {
    listUsers: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/admin/users", query }),
        schema: adminUserPageSchema,
      }),
    getUser: (handle) =>
      request({ method: "GET", path: userPath(handle), schema: adminUserDetailSchema }),
    suspendUser: ({ handle, input }) =>
      request({
        method: "POST",
        path: `${userPath(handle)}/suspensions`,
        body: input,
        schema: adminUserDetailSchema,
      }),
    liftSuspension: (handle) =>
      request({
        method: "DELETE",
        path: `${userPath(handle)}/suspension`,
        schema: adminUserDetailSchema,
      }),
    removeAvatar: (handle) =>
      request({
        method: "DELETE",
        path: `${userPath(handle)}/avatar`,
        schema: adminUserDetailSchema,
      }),
    metrics: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/admin/metrics", query }),
        schema: adminMetricsSchema,
      }),
    listTopics: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/admin/topics", query }),
        schema: adminTopicPageSchema,
      }),
    createTopic: (input) =>
      request({ method: "POST", path: "/admin/topics", body: input, schema: adminTopicSchema }),
    updateTopic: ({ slug, input }) =>
      request({
        method: "PATCH",
        path: `/admin/topics/${encodeURIComponent(slug)}`,
        body: input,
        schema: adminTopicSchema,
      }),
  }
}
