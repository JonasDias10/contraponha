import { Global, Inject, Logger, Module, type OnApplicationShutdown } from "@nestjs/common"
import { createDatabaseConnection, type DatabaseConnection } from "@ponto/database"

import { APP_CONFIG, type AppConfig } from "#src/config/app-config.js"

export const DATABASE = Symbol("DATABASE")
const DATABASE_CONNECTION = Symbol("DATABASE_CONNECTION")

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): DatabaseConnection => {
        const logger = new Logger("Database")
        return createDatabaseConnection({
          url: config.database.url,
          applicationName: "ponto-api",
          maxConnections: config.database.poolMax,
          onPoolError: (error) => logger.error({ err: error }, "Idle PostgreSQL client error"),
        })
      },
    },
    {
      provide: DATABASE,
      inject: [DATABASE_CONNECTION],
      useFactory: (connection: DatabaseConnection) => connection.db,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_CONNECTION) private readonly connection: DatabaseConnection) {}

  async onApplicationShutdown(): Promise<void> {
    await this.connection.close()
  }
}
