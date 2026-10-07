import { ApiError } from "@ponto/api-client"
import type { Translate } from "@ponto/i18n"
import type { ValidationIssue } from "@ponto/types"

export interface ErrorMessageParams {
  error: unknown
  t: Translate
}

// The API answers in the reader's language, so its message is shown as is.
export function errorMessage({ error, t }: ErrorMessageParams): string {
  if (error instanceof ApiError) return error.message

  return t("web.common.somethingWentWrong")
}

export function validationIssues(error: unknown): ValidationIssue[] {
  if (!(error instanceof ApiError) || error.code !== "VALIDATION_FAILED") return []

  return Array.isArray(error.details)
    ? error.details.filter(
        (issue): issue is ValidationIssue =>
          typeof issue === "object" && issue !== null && "path" in issue && "code" in issue,
      )
    : []
}
