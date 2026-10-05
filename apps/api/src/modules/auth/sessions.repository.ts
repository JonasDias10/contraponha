import { Inject, Injectable } from "@nestjs/common"
import { sessions, type Database, type DatabaseExecutor, type SessionRow } from "@ponto/database"
import { and, desc, eq, gt, isNull, ne } from "drizzle-orm"

import { DATABASE } from "../../infrastructure/database/database.module.js"

export interface CreateSessionData {
  userId: string
  tokenHash: string
  userAgent: string | null
  expiresAt: Date
}

function isActive(now: Date) {
  return and(isNull(sessions.revokedAt), gt(sessions.expiresAt, now))
}

@Injectable()
export class SessionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(data: CreateSessionData, executor: DatabaseExecutor = this.db): Promise<SessionRow> {
    const [session] = await executor.insert(sessions).values(data).returning()

    if (!session) {
      throw new Error("Insert into sessions returned no row")
    }

    return session
  }

  async findActiveByTokenHash(tokenHash: string): Promise<SessionRow | undefined> {
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), isActive(new Date())))
    return session
  }

  listActiveByUser(userId: string): Promise<SessionRow[]> {
    return this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isActive(new Date())))
      .orderBy(desc(sessions.lastUsedAt))
  }

  async touch(sessionId: string, lastUsedAt: Date): Promise<void> {
    await this.db.update(sessions).set({ lastUsedAt }).where(eq(sessions.id, sessionId))
  }

  async revoke(userId: string, sessionId: string): Promise<string[]> {
    return this.revokeWhere(and(eq(sessions.userId, userId), eq(sessions.id, sessionId)))
  }

  async revokeAllForUser(
    userId: string,
    { exceptSessionId, executor }: { exceptSessionId?: string; executor?: DatabaseExecutor } = {},
  ): Promise<string[]> {
    const scope = exceptSessionId
      ? and(eq(sessions.userId, userId), ne(sessions.id, exceptSessionId))
      : eq(sessions.userId, userId)
    return this.revokeWhere(scope, executor)
  }

  private async revokeWhere(
    scope: ReturnType<typeof and>,
    executor: DatabaseExecutor = this.db,
  ): Promise<string[]> {
    const revoked = await executor
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(scope, isActive(new Date())))
      .returning({ tokenHash: sessions.tokenHash })
    return revoked.map(({ tokenHash }) => tokenHash)
  }
}
