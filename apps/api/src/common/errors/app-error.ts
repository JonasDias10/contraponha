import type { ApiErrorCode } from "@ponto/types"

import { ERROR_CATALOG } from "./error-catalog.js"

export interface AppErrorOptions {
  details?: unknown
  cause?: unknown
}

export class AppError extends Error {
  readonly status: number
  readonly details: unknown

  constructor(
    readonly code: ApiErrorCode,
    { details = null, cause }: AppErrorOptions = {},
  ) {
    super(code, { cause })

    this.name = "AppError"

    this.status = ERROR_CATALOG[code].status

    this.details = details
  }
}
