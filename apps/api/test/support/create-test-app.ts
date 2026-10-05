import type { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"

import { AppModule } from "../../src/app.module.js"
import { configureApp } from "../../src/app.setup.js"
import { loadAppConfig } from "../../src/config/app-config.js"
import { ProbeController } from "./probe.controller.js"

export async function createTestApp(
  envOverrides: Record<string, string> = {},
): Promise<NestExpressApplication> {
  const config = loadAppConfig({
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    SWAGGER_ENABLED: "true",
    ...envOverrides,
  })
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config)],
    controllers: [ProbeController],
  }).compile()

  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true })
  configureApp(app, config)
  await app.init()
  return app
}
