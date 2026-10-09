import { HttpStatus } from "@nestjs/common"
import type { MessageKey } from "@contraponha/i18n"
import { ApiErrorCode } from "@contraponha/types"

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
  [ApiErrorCode.INVALID_CREDENTIALS]: {
    status: HttpStatus.UNAUTHORIZED,
    messageKey: "auth.errors.invalidCredentials",
  },
  [ApiErrorCode.ACCOUNT_SUSPENDED]: {
    status: HttpStatus.FORBIDDEN,
    messageKey: "auth.errors.accountSuspended",
  },
  [ApiErrorCode.INVALID_TOKEN]: {
    status: HttpStatus.BAD_REQUEST,
    messageKey: "auth.errors.invalidToken",
  },
  [ApiErrorCode.EMAIL_ALREADY_IN_USE]: {
    status: HttpStatus.CONFLICT,
    messageKey: "auth.errors.emailAlreadyInUse",
  },
  [ApiErrorCode.HANDLE_UNAVAILABLE]: {
    status: HttpStatus.CONFLICT,
    messageKey: "users.errors.handleUnavailable",
  },
  [ApiErrorCode.EDIT_WINDOW_EXPIRED]: {
    status: HttpStatus.CONFLICT,
    messageKey: "content.errors.editWindowExpired",
  },
  [ApiErrorCode.SELF_FOLLOW_NOT_ALLOWED]: {
    status: HttpStatus.BAD_REQUEST,
    messageKey: "follows.errors.selfFollow",
  },
  [ApiErrorCode.MEDIA_INVALID]: {
    status: HttpStatus.BAD_REQUEST,
    messageKey: "media.errors.invalid",
  },
  [ApiErrorCode.DUPLICATE_REPORT]: {
    status: HttpStatus.CONFLICT,
    messageKey: "moderation.errors.duplicateReport",
  },
  [ApiErrorCode.REACTION_LIMIT_REACHED]: {
    status: HttpStatus.CONFLICT,
    messageKey: "content.errors.reactionLimitReached",
  },
  [ApiErrorCode.REPLIES_RESTRICTED]: {
    status: HttpStatus.FORBIDDEN,
    messageKey: "content.errors.repliesRestricted",
  },
  [ApiErrorCode.DATA_EXPORT_IN_PROGRESS]: {
    status: HttpStatus.CONFLICT,
    messageKey: "users.errors.dataExportInProgress",
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

  if (code) return code

  return status >= 500 ? ApiErrorCode.INTERNAL_ERROR : ApiErrorCode.BAD_REQUEST
}
