import type { AuthResponse, SessionSummary } from "@ponto/types"
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

export const registerInputSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  handle: handleSchema,
  displayName: displayNameSchema,
  locale: localeSchema.optional(),
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
})
