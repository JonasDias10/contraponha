import type { ContextNoteView, ModerationActionView, Page, ReportView } from "@contraponha/types"
import {
  contextNoteViewSchema,
  moderationActionPageSchema,
  reportPageSchema,
  reportViewSchema,
  type ChangeRoleInput,
  type ContextNoteInput,
  type CreateReportInput,
  type PaginationQuery,
  type RemoveContentInput,
  type ReportListQuery,
  type ResolveReportInput,
} from "@contraponha/validation"

import { emptyResponseSchema, withQuery, type HttpClient } from "../http.js"

export interface ResolveReportRequest {
  reportId: string
  input: ResolveReportInput
}

export interface RemoveContentRequest {
  targetId: string
  input: RemoveContentInput
}

export interface ContextNoteRequest {
  postId: string
  input: ContextNoteInput
}

export interface ChangeRoleRequest {
  handle: string
  input: ChangeRoleInput
}

export interface ModerationResource {
  report(input: CreateReportInput): Promise<ReportView>
  listReports(query?: ReportListQuery): Promise<Page<ReportView>>
  resolveReport(request: ResolveReportRequest): Promise<void>
  removePost(request: RemoveContentRequest): Promise<void>
  removeComment(request: RemoveContentRequest): Promise<void>
  listActions(query?: PaginationQuery): Promise<Page<ModerationActionView>>
  changeRole(request: ChangeRoleRequest): Promise<void>
  setContextNote(request: ContextNoteRequest): Promise<ContextNoteView>
  removeContextNote(postId: string): Promise<void>
}

export function createModerationResource(request: HttpClient): ModerationResource {
  return {
    report: (input) =>
      request({ method: "POST", path: "/reports", body: input, schema: reportViewSchema }),
    listReports: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/moderation/reports", query }),
        schema: reportPageSchema,
      }),
    resolveReport: async ({ reportId, input }) => {
      await request({
        method: "POST",
        path: `/moderation/reports/${encodeURIComponent(reportId)}/resolve`,
        body: input,
        schema: emptyResponseSchema,
      })
    },
    removePost: async ({ targetId, input }) => {
      await request({
        method: "POST",
        path: `/moderation/posts/${encodeURIComponent(targetId)}/remove`,
        body: input,
        schema: emptyResponseSchema,
      })
    },
    removeComment: async ({ targetId, input }) => {
      await request({
        method: "POST",
        path: `/moderation/comments/${encodeURIComponent(targetId)}/remove`,
        body: input,
        schema: emptyResponseSchema,
      })
    },
    listActions: (query = {}) =>
      request({
        method: "GET",
        path: withQuery({ path: "/moderation/actions", query }),
        schema: moderationActionPageSchema,
      }),
    changeRole: async ({ handle, input }) => {
      await request({
        method: "PUT",
        path: `/moderation/users/${encodeURIComponent(handle)}/role`,
        body: input,
        schema: emptyResponseSchema,
      })
    },
    setContextNote: ({ postId, input }) =>
      request({
        method: "PUT",
        path: `/moderation/posts/${encodeURIComponent(postId)}/context`,
        body: input,
        schema: contextNoteViewSchema,
      }),
    removeContextNote: async (postId) => {
      await request({
        method: "DELETE",
        path: `/moderation/posts/${encodeURIComponent(postId)}/context`,
        schema: emptyResponseSchema,
      })
    },
  }
}
