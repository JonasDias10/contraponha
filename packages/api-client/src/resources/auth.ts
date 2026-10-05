import type { AuthResponse, SessionSummary } from "@ponto/types"
import {
  authResponseSchema,
  sessionListSchema,
  type ChangePasswordInput,
  type ConfirmEmailInput,
  type LoginInput,
  type RegisterInput,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
} from "@ponto/validation"

import { emptyResponseSchema, type HttpClient } from "../http.js"

export interface AuthResource {
  register(input: RegisterInput): Promise<AuthResponse>
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

export function createAuthResource(request: HttpClient): AuthResource {
  const send = async (
    method: "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<void> => {
    await request({ method, path, body, schema: emptyResponseSchema })
  }

  return {
    register: (input) =>
      request({ method: "POST", path: "/auth/register", body: input, schema: authResponseSchema }),
    login: (input) =>
      request({ method: "POST", path: "/auth/login", body: input, schema: authResponseSchema }),
    logout: () => send("POST", "/auth/logout"),
    changePassword: (input) => send("PUT", "/auth/password", input),
    listSessions: async () =>
      (await request({ method: "GET", path: "/auth/sessions", schema: sessionListSchema }))
        .sessions,
    revokeSession: (sessionId) => send("DELETE", `/auth/sessions/${encodeURIComponent(sessionId)}`),
    revokeOtherSessions: () => send("DELETE", "/auth/sessions"),
    resendEmailVerification: () => send("POST", "/auth/email-verification"),
    confirmEmail: (input) => send("POST", "/auth/email-verification/confirm", input),
    requestPasswordReset: (input) => send("POST", "/auth/password-reset", input),
    resetPassword: (input) => send("POST", "/auth/password-reset/confirm", input),
  }
}
