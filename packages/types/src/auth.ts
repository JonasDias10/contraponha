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
