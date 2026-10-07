import {
  Catch,
  HttpException,
  Inject,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common"
import { createTranslator, negotiateLocale } from "@contraponha/i18n"
import { ApiErrorCode, type ApiErrorResponse } from "@contraponha/types"
import type { Request, Response } from "express"

import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { AppError } from "./app-error.js"
import { ERROR_CATALOG, errorCodeFromStatus } from "./error-catalog.js"

interface NormalizedError {
  code: ApiErrorCode
  status: number
  details: unknown
}

function normalize(exception: unknown): NormalizedError {
  if (exception instanceof AppError)
    return { code: exception.code, status: exception.status, details: exception.details }

  if (exception instanceof HttpException) {
    const status = exception.getStatus()
    return { code: errorCodeFromStatus(status), status, details: null }
  }

  return {
    code: ApiErrorCode.INTERNAL_ERROR,
    status: ERROR_CATALOG[ApiErrorCode.INTERNAL_ERROR].status,
    details: null,
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  // Signature imposed by Nest's ExceptionFilter interface.
  // eslint-disable-next-line no-restricted-syntax
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp()
    const request = http.getRequest<Request>()
    const response = http.getResponse<Response>()
    const { code, status, details } = normalize(exception)

    if (status >= 500 && code !== ApiErrorCode.SERVICE_UNAVAILABLE)
      this.logger.error({ err: exception, code }, "Unhandled exception while processing request")

    if (response.headersSent) return

    const locale = negotiateLocale({
      acceptLanguage: request.headers["accept-language"],
      supported: this.config.i18n.supportedLocales,
      fallback: this.config.i18n.defaultLocale,
    })

    const t = createTranslator({ locale, fallbackLocale: this.config.i18n.defaultLocale })

    const body: ApiErrorResponse = {
      error: {
        code,
        message: t(ERROR_CATALOG[code].messageKey),
        details: status >= 500 && code !== ApiErrorCode.SERVICE_UNAVAILABLE ? null : details,
        requestId: typeof request.id === "string" ? request.id : null,
      },
    }

    response.status(status).setHeader("content-language", locale).json(body)
  }
}
