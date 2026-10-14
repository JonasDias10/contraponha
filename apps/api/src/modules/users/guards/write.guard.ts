import { Inject, Injectable, type CanActivate, type ExecutionContext } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { ApiErrorCode } from "@contraponha/types"
import type { Response } from "express"
import type { Redis } from "ioredis"

import type { AuthenticatedRequest } from "#src/common/auth/auth-context.js"
import { WRITE_ACTION_KEY } from "#src/common/auth/write-action.decorator.js"
import { AppError } from "#src/common/errors/app-error.js"
import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { REDIS } from "#src/infrastructure/redis/redis.module.js"
import {
  WRITE_LIMIT_WINDOW_SECONDS,
  writeLimitFor,
  type WriteAction,
} from "#src/modules/users/domain/write-limits.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

@Injectable()
export class WriteGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const action = this.reflector.get<WriteAction | undefined>(
      WRITE_ACTION_KEY,
      context.getHandler(),
    )

    if (!action) return true

    const http = context.switchToHttp()
    const { auth } = http.getRequest<AuthenticatedRequest>()

    if (!auth) throw new AppError(ApiErrorCode.UNAUTHORIZED)

    const user = await this.usersService.getById(auth.userId)

    if (!user.emailVerifiedAt) throw new AppError(ApiErrorCode.EMAIL_NOT_VERIFIED)

    const window = Math.floor(Date.now() / 1000 / WRITE_LIMIT_WINDOW_SECONDS)
    const key = `writes:${action}:${user.id}:${window}`
    const count = await this.redis.incr(key)

    if (count === 1) await this.redis.expire(key, WRITE_LIMIT_WINDOW_SECONDS)

    const limit = writeLimitFor({
      action,
      accountCreatedAt: user.createdAt,
      multiplier: this.config.writeLimits.multiplier,
    })

    if (count <= limit) return true

    const retryAfter = (window + 1) * WRITE_LIMIT_WINDOW_SECONDS - Math.floor(Date.now() / 1000)

    http.getResponse<Response>().setHeader("retry-after", String(retryAfter))

    throw new AppError(ApiErrorCode.RATE_LIMIT_EXCEEDED, {
      details: { action, retryAfterSeconds: retryAfter },
    })
  }
}
