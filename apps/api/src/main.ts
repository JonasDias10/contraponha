import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { EnvValidationError } from "@ponto/config"

import { AppModule } from "./app.module.js"
import { configureApp } from "./app.setup.js"
import { loadAppConfig, type AppConfig } from "./config/app-config.js"

function loadConfigOrExit(): AppConfig {
  try {
    return loadAppConfig(process.env)
  } catch (error) {
    if (error instanceof EnvValidationError) {
      process.stderr.write(`${error.message}\n`)
      process.exit(1)
    }
    throw error
  }
}

async function bootstrap(): Promise<void> {
  const config = loadConfigOrExit()
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    bufferLogs: true,
  })

  configureApp(app, config)
  app.enableShutdownHooks()

  await app.listen(config.http.port, config.http.host)
}

await bootstrap()
