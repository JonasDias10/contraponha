import type {
  AuthResponse,
  HandleAvailability,
  LoginResult,
  RecoveryCodes,
  SessionSummary,
  TwoFactorSetup,
  TwoFactorStatus,
} from "@contraponha/types"
import {
  authResponseSchema,
  handleAvailabilitySchema,
  loginResultSchema,
  recoveryCodesSchema,
  twoFactorSetupSchema,
  twoFactorStatusSchema,
  type LoginTwoFactorInput,
  type TwoFactorCodeInput,
  sessionListSchema,
  type ChangePasswordInput,
  type ConfirmEmailInput,
  type LoginInput,
  type RegisterInput,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
} from "@contraponha/validation"

import { emptyResponseSchema, type HttpClient } from "../http.js"

export interface AuthResource {
  register(input: RegisterInput): Promise<AuthResponse>
  handleAvailability(handle: string): Promise<HandleAvailability>
  login(input: LoginInput): Promise<LoginResult>
  loginTwoFactor(input: LoginTwoFactorInput): Promise<AuthResponse>
  twoFactorStatus(): Promise<TwoFactorStatus>
  startTwoFactorSetup(): Promise<TwoFactorSetup>
  enableTwoFactor(input: TwoFactorCodeInput): Promise<RecoveryCodes>
  disableTwoFactor(input: TwoFactorCodeInput): Promise<void>
  regenerateRecoveryCodes(input: TwoFactorCodeInput): Promise<RecoveryCodes>
  logout(): Promise<void>
  changePassword(input: ChangePasswordInput): Promise<void>
  listSessions(): Promise<SessionSummary[]>
  revokeSession(sessionId: string): Promise<void>
  revokeOtherSessions(): Promise<void>
  resendEmailVerification(): Promise<void>
  confirmEmail(input: ConfirmEmailInput): Promise<void>
  requestPasswordReset(input: RequestPasswordResetInput): Promise<void>
  resetPassword(input: ResetPasswordInput): Promise<void>
}

interface SendParams {
  method: "POST" | "PUT" | "DELETE"
  path: string
  body?: unknown
}

export function createAuthResource(request: HttpClient): AuthResource {
  const send = async ({ method, path, body }: SendParams): Promise<void> => {
    await request({ method, path, body, schema: emptyResponseSchema })
  }

  return {
    register: (input) =>
      request({ method: "POST", path: "/auth/register", body: input, schema: authResponseSchema }),
    handleAvailability: (handle) =>
      request({
        method: "GET",
        path: `/auth/handles/${encodeURIComponent(handle)}/availability`,
        schema: handleAvailabilitySchema,
      }),
    login: (input) =>
      request({ method: "POST", path: "/auth/login", body: input, schema: loginResultSchema }),
    loginTwoFactor: (input) =>
      request({
        method: "POST",
        path: "/auth/login/two-factor",
        body: input,
        schema: authResponseSchema,
      }),
    twoFactorStatus: () =>
      request({ method: "GET", path: "/auth/two-factor", schema: twoFactorStatusSchema }),
    startTwoFactorSetup: () =>
      request({ method: "POST", path: "/auth/two-factor/setup", schema: twoFactorSetupSchema }),
    enableTwoFactor: (input) =>
      request({
        method: "POST",
        path: "/auth/two-factor/enable",
        body: input,
        schema: recoveryCodesSchema,
      }),
    disableTwoFactor: (input) =>
      send({ method: "POST", path: "/auth/two-factor/disable", body: input }),
    regenerateRecoveryCodes: (input) =>
      request({
        method: "POST",
        path: "/auth/two-factor/recovery-codes",
        body: input,
        schema: recoveryCodesSchema,
      }),
    logout: () => send({ method: "POST", path: "/auth/logout" }),
    changePassword: (input) => send({ method: "PUT", path: "/auth/password", body: input }),
    listSessions: async () => {
      const { sessions } = await request({
        method: "GET",
        path: "/auth/sessions",
        schema: sessionListSchema,
      })

      return sessions
    },
    revokeSession: (sessionId) =>
      send({ method: "DELETE", path: `/auth/sessions/${encodeURIComponent(sessionId)}` }),
    revokeOtherSessions: () => send({ method: "DELETE", path: "/auth/sessions" }),
    resendEmailVerification: () => send({ method: "POST", path: "/auth/email-verification" }),
    confirmEmail: (input) =>
      send({ method: "POST", path: "/auth/email-verification/confirm", body: input }),
    requestPasswordReset: (input) =>
      send({ method: "POST", path: "/auth/password-reset", body: input }),
    resetPassword: (input) =>
      send({ method: "POST", path: "/auth/password-reset/confirm", body: input }),
  }
}
