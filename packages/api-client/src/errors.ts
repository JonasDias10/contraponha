import type { ApiErrorBody, ApiErrorCode } from "@ponto/types"

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly details: unknown
  readonly requestId: string | null

  constructor(
    readonly status: number,
    body: ApiErrorBody,
  ) {
    super(body.message)
    this.name = "ApiError"
    this.code = body.code
    this.details = body.details
    this.requestId = body.requestId
  }
}

export class ApiResponseFormatError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`Unexpected response format from ${path} (HTTP ${status})`)
    this.name = "ApiResponseFormatError"
  }
}
