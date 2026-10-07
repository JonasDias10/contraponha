import { ApiErrorCode, type ApiErrorResponse, type ValidationIssue } from "@contraponha/types"
import { z } from "zod"

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(ApiErrorCode),
    message: z.string(),
    details: z.unknown(),
    requestId: z.string().nullable(),
  }),
}) satisfies z.ZodType<ApiErrorResponse>

export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    code: issue.code,
  }))
}
