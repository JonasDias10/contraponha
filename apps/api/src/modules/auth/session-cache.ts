import { Inject, Injectable } from "@nestjs/common"
import type { Redis } from "ioredis"

import { REDIS } from "../../infrastructure/redis/redis.module.js"

const MAX_CACHE_TTL_SECONDS = 15 * 60

export interface CachedSession {
  sessionId: string
  userId: string
  expiresAt: string
  lastUsedAt: string
}

function cacheKey(tokenHash: string): string {
  return `session:${tokenHash}`
}

@Injectable()
export class SessionCache {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async get(tokenHash: string): Promise<CachedSession | undefined> {
    const value = await this.redis.get(cacheKey(tokenHash))
    return value ? (JSON.parse(value) as CachedSession) : undefined
  }

  async set(tokenHash: string, session: CachedSession): Promise<void> {
    const secondsUntilExpiry = Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000)
    const ttl = Math.min(secondsUntilExpiry, MAX_CACHE_TTL_SECONDS)

    if (ttl > 0) {
      await this.redis.set(cacheKey(tokenHash), JSON.stringify(session), "EX", ttl)
    }
  }

  async delete(tokenHashes: readonly string[]): Promise<void> {
    if (tokenHashes.length > 0) {
      await this.redis.del(...tokenHashes.map(cacheKey))
    }
  }
}
