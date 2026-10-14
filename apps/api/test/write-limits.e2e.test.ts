import type { NestExpressApplication } from "@nestjs/platform-express"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createTestApp } from "./support/create-test-app.js"

describe("publishing safeguards", () => {
  let app: NestExpressApplication
  let server: App

  beforeAll(async () => {
    const testApp = await createTestApp({ WRITE_LIMIT_MULTIPLIER: "1" })

    app = testApp.app

    server = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  it("requires a confirmed email to publish", async () => {
    const { auth } = await registerAccount({ server, isEmailVerified: false })

    const response = await request(server)
      .post("/api/v1/posts")
      .set(bearer(auth.session.token))
      .send({ body: "Primeiro post" })
      .expect(403)

    expect(response.body.error.code).toBe("EMAIL_NOT_VERIFIED")
  })

  it("limits how much a brand-new account can post per hour", async () => {
    const { auth } = await registerAccount({ server })
    const statuses: number[] = []

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await request(server)
        .post("/api/v1/posts")
        .set(bearer(auth.session.token))
        .send({ body: `Post número ${attempt}` })

      statuses.push(response.status)
    }

    expect(statuses).toEqual([201, 201, 201, 201, 201, 429])

    const limited = await request(server)
      .post("/api/v1/posts")
      .set(bearer(auth.session.token))
      .send({ body: "Mais um" })
      .expect(429)

    expect(limited.body.error.code).toBe("RATE_LIMIT_EXCEEDED")

    expect(Number(limited.headers["retry-after"])).toBeGreaterThan(0)
  })
})
