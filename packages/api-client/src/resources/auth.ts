import type { AuthResponse, HandleAvailability, SessionSummary } from "@contraponha/types"
import {
  authResponseSchema,
  handleAvailabilitySchema,
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
  login(input: LoginInput): Promise<AuthResponse>
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
      request({ method: "POST", path: "/auth/login", body: input, schema: authResponseSchema }),
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
