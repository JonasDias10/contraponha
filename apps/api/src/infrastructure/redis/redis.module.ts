import { Global, Inject, Logger, Module, type OnApplicationShutdown } from "@nestjs/common"
import { Redis } from "ioredis"

import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"
import { REDIS_COMMAND_TIMEOUT_MS } from "#src/config/durations.js"

export const REDIS = Symbol("REDIS")

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): Redis => {
        const logger = new Logger("Redis")

        const client = new Redis(config.redis.url, {
          connectionName: "ponto-api",
          maxRetriesPerRequest: 2,
          commandTimeout: REDIS_COMMAND_TIMEOUT_MS,
        })

        client.on("error", (error: Error) => logger.warn({ err: error }, "Redis connection error"))

        return client
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    if (this.redis.status !== "end") await this.redis.quit()
  }
}
