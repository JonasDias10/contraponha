import { Inject, Injectable } from "@nestjs/common"
import { msToSeconds } from "@contraponha/config"
import type { Redis } from "ioredis"

import { SESSION_CACHE_MAX_TTL_SECONDS } from "#src/config/durations.js"
import { REDIS } from "#src/infrastructure/redis/redis.module.js"

export interface CachedSession {
  sessionId: string
  userId: string
  expiresAt: string
  lastUsedAt: string
}

function cacheKey(tokenHash: string): string {
  return `session:${tokenHash}`
}

export interface SetCachedSessionParams {
  tokenHash: string
  session: CachedSession
}

@Injectable()
export class SessionCache {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async get(tokenHash: string): Promise<CachedSession | undefined> {
    const value = await this.redis.get(cacheKey(tokenHash))
    return value ? (JSON.parse(value) as CachedSession) : undefined
  }

  async set({ tokenHash, session }: SetCachedSessionParams): Promise<void> {
    const secondsUntilExpiry = msToSeconds(Date.parse(session.expiresAt) - Date.now())
    const ttl = Math.min(secondsUntilExpiry, SESSION_CACHE_MAX_TTL_SECONDS)

    if (ttl > 0) await this.redis.set(cacheKey(tokenHash), JSON.stringify(session), "EX", ttl)
  }

  async delete(tokenHashes: readonly string[]): Promise<void> {
    if (tokenHashes.length > 0) await this.redis.del(...tokenHashes.map(cacheKey))
  }
}
