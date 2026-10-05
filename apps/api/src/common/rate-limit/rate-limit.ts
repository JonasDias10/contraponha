import { SetMetadata, type ExecutionContext } from "@nestjs/common"
import type { ThrottlerOptions } from "@nestjs/throttler"

import type { AppConfig } from "#src/config/app-config.js"

const SENSITIVE_RATE_LIMIT_KEY = "rateLimit:sensitive"

export const SensitiveRateLimit = (): MethodDecorator => SetMetadata(SENSITIVE_RATE_LIMIT_KEY, true)

function isSensitiveRoute(context: ExecutionContext): boolean {
  return Reflect.getMetadata(SENSITIVE_RATE_LIMIT_KEY, context.getHandler()) === true
}

export function buildThrottlers(config: AppConfig): ThrottlerOptions[] {
  return [
    { name: "default", ttl: config.rateLimit.ttlMs, limit: config.rateLimit.limit },
    {
      name: "sensitive",
      ttl: config.auth.rateLimit.ttlMs,
      limit: config.auth.rateLimit.limit,
      skipIf: (context) => !isSensitiveRoute(context),
    },
  ]
}
