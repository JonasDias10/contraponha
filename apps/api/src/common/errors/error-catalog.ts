import { HttpStatus } from "@nestjs/common"
import type { MessageKey } from "@ponto/i18n"
import { ApiErrorCode } from "@ponto/types"

interface ErrorDefinition {
  status: HttpStatus
  messageKey: MessageKey
}

export const ERROR_CATALOG: Record<ApiErrorCode, ErrorDefinition> = {
  [ApiErrorCode.BAD_REQUEST]: {
    status: HttpStatus.BAD_REQUEST,
    messageKey: "common.errors.badRequest",
  },
  [ApiErrorCode.VALIDATION_FAILED]: {
    status: HttpStatus.BAD_REQUEST,
    messageKey: "common.errors.validationFailed",
  },
  [ApiErrorCode.UNAUTHORIZED]: {
    status: HttpStatus.UNAUTHORIZED,
    messageKey: "common.errors.unauthorized",
  },
  [ApiErrorCode.FORBIDDEN]: {
    status: HttpStatus.FORBIDDEN,
    messageKey: "common.errors.forbidden",
  },
  [ApiErrorCode.RESOURCE_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    messageKey: "common.errors.notFound",
  },
  [ApiErrorCode.CONFLICT]: {
    status: HttpStatus.CONFLICT,
    messageKey: "common.errors.conflict",
  },
  [ApiErrorCode.PAYLOAD_TOO_LARGE]: {
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    messageKey: "common.errors.payloadTooLarge",
  },
  [ApiErrorCode.RATE_LIMIT_EXCEEDED]: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    messageKey: "common.errors.tooManyRequests",
  },
  [ApiErrorCode.INTERNAL_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    messageKey: "common.errors.internal",
  },
  [ApiErrorCode.SERVICE_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    messageKey: "common.errors.serviceUnavailable",
  },
}

const CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ApiErrorCode.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ApiErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ApiErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ApiErrorCode.RESOURCE_NOT_FOUND,
  [HttpStatus.CONFLICT]: ApiErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ApiErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.TOO_MANY_REQUESTS]: ApiErrorCode.RATE_LIMIT_EXCEEDED,
  [HttpStatus.SERVICE_UNAVAILABLE]: ApiErrorCode.SERVICE_UNAVAILABLE,
}

export function errorCodeFromStatus(status: number): ApiErrorCode {
  const code = CODE_BY_STATUS[status]
  if (code) {
    return code
  }
  return status >= 500 ? ApiErrorCode.INTERNAL_ERROR : ApiErrorCode.BAD_REQUEST
}
