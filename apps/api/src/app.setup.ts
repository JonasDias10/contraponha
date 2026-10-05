import { VersioningType } from "@nestjs/common"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { API_DEFAULT_VERSION, API_GLOBAL_PREFIX, REQUEST_ID_HEADER } from "@ponto/config"
import helmet from "helmet"
import { Logger } from "nestjs-pino"

import { setupSwagger } from "#src/common/openapi/swagger.js"
import type { AppConfig } from "#src/config/app-config.js"

export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.useLogger(app.get(Logger))
  app.set("trust proxy", config.http.trustProxy)
  app.disable("x-powered-by")
  app.use(helmet())

  if (config.http.corsOrigins.length > 0) {
    app.enableCors({
      origin: config.http.corsOrigins,
      credentials: true,
      exposedHeaders: [REQUEST_ID_HEADER],
    })
  }

  app.setGlobalPrefix(API_GLOBAL_PREFIX)
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: API_DEFAULT_VERSION })

  if (config.swagger.enabled) {
    setupSwagger(app)
  }
}
