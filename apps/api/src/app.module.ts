import { Module, type DynamicModule } from "@nestjs/common"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { LoggerModule } from "nestjs-pino"

import { AllExceptionsFilter } from "./common/errors/all-exceptions.filter.js"
import { buildLoggerParams } from "./common/logging/logger.options.js"
import type { AppConfig } from "./config/app-config.js"
import { ConfigModule } from "./config/config.module.js"
import { DatabaseModule } from "./infrastructure/database/database.module.js"
import { RedisModule } from "./infrastructure/redis/redis.module.js"
import { HealthModule } from "./modules/health/health.module.js"

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        LoggerModule.forRoot(buildLoggerParams(config)),
        ThrottlerModule.forRoot([{ ttl: config.rateLimit.ttlMs, limit: config.rateLimit.limit }]),
        DatabaseModule,
        RedisModule,
        HealthModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }
  }
}
