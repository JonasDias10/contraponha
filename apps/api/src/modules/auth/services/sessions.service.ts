import { Inject, Injectable, Logger } from "@nestjs/common"
import type { DatabaseExecutor, SessionRow } from "@ponto/database"
import { ApiErrorCode, type IssuedSession, type SessionSummary } from "@ponto/types"

import type { AuthContext } from "#src/common/auth/auth-context.js"
import { AppError } from "#src/common/errors/app-error.js"
import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { SESSION_LAST_USED_WRITE_INTERVAL_MS } from "#src/config/durations.js"
import { generateOpaqueToken, hashOpaqueToken } from "#src/modules/auth/domain/opaque-token.js"
import { SessionCache, type CachedSession } from "#src/modules/auth/infrastructure/session-cache.js"
import { SessionsRepository } from "#src/modules/auth/repositories/sessions.repository.js"

const USER_AGENT_MAX_LENGTH = 255

function toCachedSession(session: SessionRow): CachedSession {
  return {
    sessionId: session.id,
    userId: session.userId,
    expiresAt: session.expiresAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
  }
}

interface ToSessionSummaryParams {
  session: SessionRow
  currentSessionId: string
}

function toSessionSummary({ session, currentSessionId }: ToSessionSummaryParams): SessionSummary {
  return {
    id: session.id,
    userAgent: session.userAgent,
    createdAt: session.createdAt.toISOString(),
    lastUsedAt: session.lastUsedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    isCurrent: session.id === currentSessionId,
  }
}

interface RecordSessionUsageParams {
  tokenHash: string
  session: CachedSession
}

export interface RevokeAllUserSessionsParams {
  userId: string
  executor?: DatabaseExecutor
}

export interface RevokeUserSessionParams {
  userId: string
  sessionId: string
}

export interface IssueSessionParams {
  userId: string
  userAgent: string | undefined
  executor?: DatabaseExecutor
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name)

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly sessionsRepository: SessionsRepository,
    private readonly sessionCache: SessionCache,
  ) {}

  async issue({ userId, userAgent, executor }: IssueSessionParams): Promise<IssuedSession> {
    const token = generateOpaqueToken()

    const session = await this.sessionsRepository.create({
      data: {
        userId,
        tokenHash: hashOpaqueToken(token),
        userAgent: userAgent?.slice(0, USER_AGENT_MAX_LENGTH) ?? null,
        expiresAt: new Date(Date.now() + this.config.auth.sessionTtlMs),
      },
      executor,
    })

    return { token, expiresAt: session.expiresAt.toISOString() }
  }

  async authenticate(token: string): Promise<AuthContext | undefined> {
    const tokenHash = hashOpaqueToken(token)
    const session = await this.findActiveSession(tokenHash)

    if (!session) return undefined

    this.recordUsage({ tokenHash, session })

    return { userId: session.userId, sessionId: session.sessionId }
  }

  async list(auth: AuthContext): Promise<SessionSummary[]> {
    const sessions = await this.sessionsRepository.listActiveByUser(auth.userId)
    return sessions.map((session) =>
      toSessionSummary({ session, currentSessionId: auth.sessionId }),
    )
  }

  async revoke({ userId, sessionId }: RevokeUserSessionParams): Promise<void> {
    const revoked = await this.sessionsRepository.revoke({ userId, sessionId })

    if (revoked.length === 0) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    await this.sessionCache.delete(revoked)
  }

  async revokeOthers(auth: AuthContext): Promise<void> {
    const revoked = await this.sessionsRepository.revokeAllForUser({
      userId: auth.userId,
      exceptSessionId: auth.sessionId,
    })

    await this.sessionCache.delete(revoked)
  }

  revokeAll({ userId, executor }: RevokeAllUserSessionsParams): Promise<string[]> {
    return this.sessionsRepository.revokeAllForUser({ userId, executor })
  }

  async evictFromCache(tokenHashes: readonly string[]): Promise<void> {
    await this.sessionCache.delete(tokenHashes)
  }

  private async findActiveSession(tokenHash: string): Promise<CachedSession | undefined> {
    const cached = await this.sessionCache.get(tokenHash)

    if (cached) return Date.parse(cached.expiresAt) > Date.now() ? cached : undefined

    const session = await this.sessionsRepository.findActiveByTokenHash(tokenHash)

    if (!session) return undefined

    const entry = toCachedSession(session)

    await this.sessionCache.set({ tokenHash, session: entry })

    return entry
  }

  private recordUsage({ tokenHash, session }: RecordSessionUsageParams): void {
    const now = new Date()

    if (now.getTime() - Date.parse(session.lastUsedAt) < SESSION_LAST_USED_WRITE_INTERVAL_MS) return

    const updated = { ...session, lastUsedAt: now.toISOString() }

    Promise.all([
      this.sessionsRepository.touch({ sessionId: session.sessionId, lastUsedAt: now }),
      this.sessionCache.set({ tokenHash, session: updated }),
    ]).catch((error: unknown) => {
      this.logger.warn(
        { err: error, sessionId: session.sessionId },
        "Failed to record session usage",
      )
    })
  }
}
