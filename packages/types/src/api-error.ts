export const ApiErrorCode = {
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_FAILED: "VALIDATION_FAILED",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  CONFLICT: "CONFLICT",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode]

export interface ValidationIssue {
  path: string
  code: string
}

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  details: unknown
  requestId: string | null
}

export interface ApiErrorResponse {
  error: ApiErrorBody
}
