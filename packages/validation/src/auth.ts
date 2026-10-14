import type {
  AuthResponse,
  LoginResult,
  RecoveryCodes,
  TwoFactorChallenge,
  TwoFactorSetup,
  TwoFactorStatus,
  HandleAvailability,
  SessionListResponse,
  SessionSummary,
} from "@contraponha/types"
import { ageInYears, MINIMUM_AGE_YEARS } from "@contraponha/config"
import { z } from "zod"

import {
  displayNameSchema,
  emailSchema,
  handleSchema,
  localeSchema,
  privateProfileSchema,
} from "./users.js"

export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128

export const newPasswordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH)

const submittedPasswordSchema = z.string().min(1).max(PASSWORD_MAX_LENGTH)

export const opaqueTokenSchema = z
  .string()
  .min(32)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/)

export const birthDateSchema = z.iso
  .date()
  .refine((birthDate) => ageInYears({ birthDate }) >= MINIMUM_AGE_YEARS, {
    message: `You must be at least ${MINIMUM_AGE_YEARS} years old`,
  })
  .refine((birthDate) => ageInYears({ birthDate }) <= 120, { message: "Invalid birth date" })

export const registerInputSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  handle: handleSchema,
  displayName: displayNameSchema,
  birthDate: birthDateSchema,
  acceptedTerms: z.literal(true),
  locale: localeSchema.optional(),
  // Cloudflare Turnstile response; required when the API has a Turnstile secret.
  humanCheckToken: z.string().max(2048).optional(),
})

export const loginInputSchema = z.object({
  email: emailSchema,
  password: submittedPasswordSchema,
})

export const changePasswordInputSchema = z.object({
  currentPassword: submittedPasswordSchema,
  newPassword: newPasswordSchema,
})

export const confirmEmailInputSchema = z.object({
  token: opaqueTokenSchema,
})

export const requestPasswordResetInputSchema = z.object({
  email: emailSchema,
})

export const resetPasswordInputSchema = z.object({
  token: opaqueTokenSchema,
  newPassword: newPasswordSchema,
})

export type RegisterInput = z.input<typeof registerInputSchema>
export type LoginInput = z.input<typeof loginInputSchema>
export type ChangePasswordInput = z.input<typeof changePasswordInputSchema>
export type ConfirmEmailInput = z.input<typeof confirmEmailInputSchema>
export type RequestPasswordResetInput = z.input<typeof requestPasswordResetInputSchema>
export type ResetPasswordInput = z.input<typeof resetPasswordInputSchema>

export const authResponseSchema = z.object({
  user: privateProfileSchema,
  session: z.object({
    token: opaqueTokenSchema,
    expiresAt: z.iso.datetime(),
  }),
}) satisfies z.ZodType<AuthResponse>

export const handleAvailabilitySchema = z.object({
  handle: z.string(),
  isAvailable: z.boolean(),
}) satisfies z.ZodType<HandleAvailability>

export const sessionSummarySchema = z.object({
  id: z.uuid(),
  userAgent: z.string().nullable(),
  createdAt: z.iso.datetime(),
  lastUsedAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  isCurrent: z.boolean(),
}) satisfies z.ZodType<SessionSummary>

export const sessionListSchema = z.object({
  sessions: z.array(sessionSummarySchema),
}) satisfies z.ZodType<SessionListResponse>

// Six digits from the authenticator, or a recovery code (xxxx-xxxx-xxxx, any case).
export const twoFactorCodeSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z.union([
      z.string().regex(/^\d{6}$/),
      z.string().regex(/^[a-z2-7]{4}-[a-z2-7]{4}-[a-z2-7]{4}$/),
    ]),
  )

export const twoFactorCodeInputSchema = z.object({ code: twoFactorCodeSchema })

export const loginTwoFactorInputSchema = z.object({
  challengeToken: opaqueTokenSchema,
  code: twoFactorCodeSchema,
})

export type TwoFactorCodeInput = z.input<typeof twoFactorCodeInputSchema>
export type LoginTwoFactorInput = z.input<typeof loginTwoFactorInputSchema>

export const twoFactorChallengeSchema = z.object({
  challengeToken: opaqueTokenSchema,
  expiresAt: z.iso.datetime(),
}) satisfies z.ZodType<TwoFactorChallenge>

export const loginResultSchema = z.union([
  authResponseSchema,
  twoFactorChallengeSchema,
]) satisfies z.ZodType<LoginResult>

export const twoFactorStatusSchema = z.object({
  isEnabled: z.boolean(),
  recoveryCodesLeft: z.number().int().nonnegative(),
}) satisfies z.ZodType<TwoFactorStatus>

export const twoFactorSetupSchema = z.object({
  secret: z.string(),
  otpauthUrl: z.string().startsWith("otpauth://"),
}) satisfies z.ZodType<TwoFactorSetup>

export const recoveryCodesSchema = z.object({
  codes: z.array(z.string()),
}) satisfies z.ZodType<RecoveryCodes>

export function isTwoFactorChallenge(result: LoginResult): result is TwoFactorChallenge {
  return "challengeToken" in result
}
