import type { PrivateProfile } from "./users.js"

export interface IssuedSession {
  token: string
  expiresAt: string
}

export interface AuthResponse {
  user: PrivateProfile
  session: IssuedSession
}

export interface HandleAvailability {
  handle: string
  isAvailable: boolean
}

export interface SessionListResponse {
  sessions: SessionSummary[]
}

export interface SessionSummary {
  id: string
  userAgent: string | null
  createdAt: string
  lastUsedAt: string
  expiresAt: string
  isCurrent: boolean
}

// Returned by login instead of a session when the account has two-step verification.
export interface TwoFactorChallenge {
  challengeToken: string
  expiresAt: string
}

export type LoginResult = AuthResponse | TwoFactorChallenge

export interface TwoFactorStatus {
  isEnabled: boolean
  recoveryCodesLeft: number
}

export interface TwoFactorSetup {
  secret: string
  otpauthUrl: string
}

// Shown once; only hashes are kept.
export interface RecoveryCodes {
  codes: string[]
}
