import type {
  AccountDeletionStatus,
  DataExportDownload,
  DataExportList,
  DataExportView,
} from "@ponto/types"
import {
  accountDeletionStatusSchema,
  dataExportDownloadSchema,
  dataExportListSchema,
  dataExportViewSchema,
  type RequestDataExportInput,
  type ScheduleAccountDeletionInput,
} from "@ponto/validation"

import { emptyResponseSchema, type HttpClient } from "../http.js"

export interface AccountResource {
  requestDataExport(input: RequestDataExportInput): Promise<DataExportView>
  listDataExports(): Promise<DataExportList>
  downloadDataExport(exportId: string): Promise<DataExportDownload>
  deletionStatus(): Promise<AccountDeletionStatus>
  scheduleDeletion(input: ScheduleAccountDeletionInput): Promise<AccountDeletionStatus>
  cancelDeletion(): Promise<AccountDeletionStatus>
  resetRecommendations(): Promise<void>
}

export function createAccountResource(request: HttpClient): AccountResource {
  return {
    requestDataExport: (input) =>
      request({
        method: "POST",
        path: "/me/data-exports",
        body: input,
        schema: dataExportViewSchema,
      }),
    listDataExports: () =>
      request({ method: "GET", path: "/me/data-exports", schema: dataExportListSchema }),
    downloadDataExport: (exportId) =>
      request({
        method: "GET",
        path: `/me/data-exports/${encodeURIComponent(exportId)}/download`,
        schema: dataExportDownloadSchema,
      }),
    deletionStatus: () =>
      request({ method: "GET", path: "/me/deletion", schema: accountDeletionStatusSchema }),
    scheduleDeletion: (input) =>
      request({
        method: "PUT",
        path: "/me/deletion",
        body: input,
        schema: accountDeletionStatusSchema,
      }),
    cancelDeletion: () =>
      request({ method: "DELETE", path: "/me/deletion", schema: accountDeletionStatusSchema }),
    resetRecommendations: async () => {
      await request({
        method: "POST",
        path: "/me/recommendations/reset",
        schema: emptyResponseSchema,
      })
    },
  }
}
