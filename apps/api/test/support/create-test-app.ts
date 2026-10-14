import type { NestExpressApplication } from "@nestjs/platform-express"
import { Test } from "@nestjs/testing"
import { inject } from "vitest"

import { AppModule } from "#src/app.module.js"
import { configureApp } from "#src/app.setup.js"
import { loadAppConfig } from "#src/config/app-config.js"
import { EmailSender } from "#src/infrastructure/email/email-sender.js"
import { RemoteFetcher } from "#src/infrastructure/http/remote-fetcher.js"
import { HumanVerifier } from "#src/infrastructure/human-check/human-verifier.js"
import { PushSender } from "#src/infrastructure/push/push-sender.js"
import { CapturingEmailSender } from "./capturing-email-sender.js"
import { CapturingPushSender } from "./capturing-push-sender.js"
import { FakeHumanVerifier } from "./fake-human-verifier.js"
import { FakeRemoteFetcher } from "./fake-remote-fetcher.js"
import { ProbeController } from "./probe.controller.js"

export interface TestApp {
  app: NestExpressApplication
  emails: CapturingEmailSender
  pushes: CapturingPushSender
  remote: FakeRemoteFetcher
}

export async function createTestApp(envOverrides: Record<string, string> = {}): Promise<TestApp> {
  const config = loadAppConfig({
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    SWAGGER_ENABLED: "true",
    DATABASE_URL: inject("testDatabaseUrl"),
    AUTH_RATE_LIMIT_MAX_REQUESTS: "1000",
    BACKGROUND_JOBS_ENABLED: "false",
    // Tests publish a lot from new accounts; the limits have their own test.
    WRITE_LIMIT_MULTIPLIER: "1000",
    ...envOverrides,
  })

  const emails = new CapturingEmailSender()
  const pushes = new CapturingPushSender()
  const remote = new FakeRemoteFetcher()

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config)],
    controllers: [ProbeController],
  })
    .overrideProvider(EmailSender)
    .useValue(emails)
    .overrideProvider(PushSender)
    .useValue(pushes)
    .overrideProvider(RemoteFetcher)
    .useValue(remote)
    .overrideProvider(HumanVerifier)
    .useValue(new FakeHumanVerifier())
    .compile()

  const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true })

  configureApp({ app, config })

  await app.init()

  return { app, emails, pushes, remote }
}
