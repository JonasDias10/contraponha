import type { Translate } from "@contraponha/i18n"
import type { Verification } from "@contraponha/types"

export interface VerificationLabelParams {
  verification: Verification
  t: Translate
}

export function verificationLabel({ verification, t }: VerificationLabelParams): string {
  return t("web.verification.label", { category: t(`web.verification.${verification.category}`) })
}
