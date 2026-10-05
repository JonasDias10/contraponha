import type { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"
import { inject } from "vitest"

import { AppModule } from "#src/app.module.js"
import { configureApp } from "#src/app.setup.js"
import { loadAppConfig } from "#src/config/app-config.js"
import { EmailSender } from "#src/infrastructure/email/email-sender.js"
import { CapturingEmailSender } from "./capturing-email-sender.js"
import { ProbeController } from "./probe.controller.js"

export interface TestApp {
  app: NestExpressApplication
  emails: CapturingEmailSender
}

export async function createTestApp(envOverrides: Record<string, string> = {}): Promise<TestApp> {
  const config = loadAppConfig({
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    SWAGGER_ENABLED: "true",
    DATABASE_URL: inject("testDatabaseUrl"),
    AUTH_RATE_LIMIT_MAX_REQUESTS: "1000",
    ...envOverrides,
  })
  const emails = new CapturingEmailSender()
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config)],
    controllers: [ProbeController],
  })
    .overrideProvider(EmailSender)
    .useValue(emails)
    .compile()

  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true })
  configureApp({ app, config })
  await app.init()
  return { app, emails }
}
