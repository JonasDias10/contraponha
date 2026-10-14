import { Inject, Injectable } from "@nestjs/common"
import type { Redis } from "ioredis"
import { z } from "zod"

import { REDIS } from "#src/infrastructure/redis/redis.module.js"
import { generateOpaqueToken, hashOpaqueToken } from "#src/modules/auth/domain/opaque-token.js"

const TTL_SECONDS = 5 * 60
const MAX_ATTEMPTS = 5

const challengeSchema = z.object({ userId: z.uuid(), userAgent: z.string().nullable() })

export interface IssuedChallenge {
  token: string
  expiresAt: Date
}

export interface IssueChallengeParams {
  userId: string
  userAgent: string | undefined
}

export interface PendingLogin {
  userId: string
  userAgent: string | undefined
}

// The step between a correct password and a session for accounts with two-step
// verification. Only the token's hash is stored; a challenge allows five tries.
@Injectable()
export class TwoFactorChallenges {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async issue({ userId, userAgent }: IssueChallengeParams): Promise<IssuedChallenge> {
    const token = generateOpaqueToken()
    const value = JSON.stringify({ userId, userAgent: userAgent ?? null })

    await this.redis.set(this.keyOf(token), value, "EX", TTL_SECONDS)

    return { token, expiresAt: new Date(Date.now() + TTL_SECONDS * 1000) }
  }

  // Counts the attempt; returns undefined once the challenge is gone or used up.
  async attempt(token: string): Promise<PendingLogin | undefined> {
    const key = this.keyOf(token)
    const stored = await this.redis.get(key)

    if (!stored) return undefined

    const attempts = await this.redis.incr(`${key}:attempts`)

    if (attempts === 1) await this.redis.expire(`${key}:attempts`, TTL_SECONDS)

    if (attempts > MAX_ATTEMPTS) {
      await this.consume(token)

      return undefined
    }

    const { userId, userAgent } = challengeSchema.parse(JSON.parse(stored))

    return { userId, userAgent: userAgent ?? undefined }
  }

  async consume(token: string): Promise<void> {
    const key = this.keyOf(token)

    await this.redis.del(key, `${key}:attempts`)
  }

  private keyOf(token: string): string {
    return `two-factor:challenge:${hashOpaqueToken(token)}`
  }
}
