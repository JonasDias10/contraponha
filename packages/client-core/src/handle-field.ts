import type { Translate } from "@contraponha/i18n"

export type HandleAvailabilityStatus = "idle" | "checking" | "available" | "taken"

export interface HandleAvailabilityState {
  status: HandleAvailabilityStatus
  handle: string
}

export interface HandleFieldMessages {
  hint: string
  error?: string
  success?: string
}

export interface HandleFieldMessagesParams {
  availability: HandleAvailabilityState
  t: Translate
}

export function handleFieldMessages({
  availability,
  t,
}: HandleFieldMessagesParams): HandleFieldMessages {
  const { status, handle } = availability

  if (status === "checking") return { hint: t("web.auth.handleChecking") }

  if (status === "taken")
    return { hint: t("web.auth.handleHint"), error: t("users.errors.handleUnavailable") }

  if (status === "available")
    return { hint: t("web.auth.handleHint"), success: t("web.auth.handleAvailable", { handle }) }

  return { hint: t("web.auth.handleHint") }
}
