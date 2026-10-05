import { Module, type DynamicModule } from "@nestjs/common"
import { APP_FILTER, APP_GUARD } from "@nestjs/core"
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { LoggerModule } from "nestjs-pino"

import { AllExceptionsFilter } from "#src/common/errors/all-exceptions.filter.js"
import { buildLoggerParams } from "#src/common/logging/logger.options.js"
import { buildThrottlers } from "#src/common/rate-limit/rate-limit.js"
import type { AppConfig } from "#src/config/app-config.js"
import { ConfigModule } from "#src/config/config.module.js"
import { DatabaseModule } from "#src/infrastructure/database/database.module.js"
import { EmailModule } from "#src/infrastructure/email/email.module.js"
import { RedisModule } from "#src/infrastructure/redis/redis.module.js"
import { AuthModule } from "#src/modules/auth/auth.module.js"
import { SessionAuthGuard } from "#src/modules/auth/guards/session-auth.guard.js"
import { HealthModule } from "#src/modules/health/health.module.js"
import { UsersModule } from "#src/modules/users/users.module.js"

@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        LoggerModule.forRoot(buildLoggerParams(config)),
        ThrottlerModule.forRoot(buildThrottlers(config)),
        DatabaseModule,
        RedisModule,
        EmailModule,
        HealthModule,
        UsersModule,
        AuthModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useExisting: SessionAuthGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }
  }
}
