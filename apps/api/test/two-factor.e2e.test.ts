import type { NestExpressApplication } from "@nestjs/platform-express"
import {
  authResponseSchema,
  recoveryCodesSchema,
  twoFactorChallengeSchema,
  twoFactorSetupSchema,
} from "@contraponha/validation"
import { generate } from "otplib"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import {
  bearer,
  registerAccount,
  setRole,
  type App,
  type RegisteredAccount,
} from "./support/accounts.js"
import { createTestApp } from "./support/create-test-app.js"

interface EnabledAccount {
  account: RegisteredAccount
  secret: string
  recoveryCodes: string[]
}

const STEP_MS = 30_000

interface CodeAtParams {
  secret: string
  offset: number
}

// A code for the time step `offset` steps from now, to control when a step is reused.
async function codeAt({ secret, offset }: CodeAtParams): Promise<string> {
  return generate({ secret, epoch: Math.floor((Date.now() + offset * STEP_MS) / 1000) })
}

describe("two-step verification", () => {
  let app: NestExpressApplication
  let server: App

  beforeAll(async () => {
    const testApp = await createTestApp()

    app = testApp.app

    server = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  async function enableFor(account: RegisteredAccount): Promise<EnabledAccount> {
    const token = account.auth.session.token

    const setup = await request(server)
      .post("/api/v1/auth/two-factor/setup")
      .set(bearer(token))
      .expect(201)

    const { secret, otpauthUrl } = twoFactorSetupSchema.parse(setup.body)

    expect(otpauthUrl).toContain("issuer=Contraponha")

    const code = await codeAt({ secret, offset: 0 })

    const enabled = await request(server)
      .post("/api/v1/auth/two-factor/enable")
      .set(bearer(token))
      .send({ code })
      .expect(201)

    return { account, secret, recoveryCodes: recoveryCodesSchema.parse(enabled.body).codes }
  }

  it("asks for a code after the password and refuses a reused one", async () => {
    const account = await registerAccount({ server })
    const { secret } = await enableFor(account)

    const login = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: account.input.email, password: account.input.password })
      .expect(200)

    const { challengeToken } = twoFactorChallengeSchema.parse(login.body)

    const sameStep = await codeAt({ secret, offset: 0 })

    await request(server)
      .post("/api/v1/auth/login/two-factor")
      .send({ challengeToken, code: sameStep })
      .expect(401)

    const nextStep = await codeAt({ secret, offset: 1 })

    const finished = await request(server)
      .post("/api/v1/auth/login/two-factor")
      .send({ challengeToken, code: nextStep })
      .expect(200)

    expect(authResponseSchema.parse(finished.body).user.isTwoFactorEnabled).toBe(true)

    await request(server)
      .post("/api/v1/auth/login/two-factor")
      .send({ challengeToken, code: nextStep })
      .expect(400)
  })

  it("accepts each recovery code once", async () => {
    const account = await registerAccount({ server })
    const { recoveryCodes } = await enableFor(account)
    const [recovery = ""] = recoveryCodes

    expect(recoveryCodes).toHaveLength(10)

    for (const expected of [200, 401]) {
      const login = await request(server)
        .post("/api/v1/auth/login")
        .send({ email: account.input.email, password: account.input.password })
        .expect(200)

      await request(server)
        .post("/api/v1/auth/login/two-factor")
        .send({ challengeToken: login.body.challengeToken, code: recovery.toUpperCase() })
        .expect(expected)
    }
  })

  it("turns off with a code and logins go back to one step", async () => {
    const account = await registerAccount({ server })
    const { secret } = await enableFor(account)
    const code = await codeAt({ secret, offset: 1 })

    await request(server)
      .post("/api/v1/auth/two-factor/disable")
      .set(bearer(account.auth.session.token))
      .send({ code })
      .expect(204)

    const login = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: account.input.email, password: account.input.password })
      .expect(200)

    expect(authResponseSchema.parse(login.body).session.token).toBeTruthy()
  })

  it("keeps moderation closed to staff without two-step verification", async () => {
    const account = await registerAccount({ server })

    await setRole({ userId: account.auth.user.id, role: "moderator", isTwoFactorEnabled: false })

    const refused = await request(server)
      .get("/api/v1/moderation/reports")
      .set(bearer(account.auth.session.token))
      .expect(403)

    expect(refused.body.error.code).toBe("TWO_FACTOR_REQUIRED")

    await enableFor(account)

    await request(server)
      .get("/api/v1/moderation/reports")
      .set(bearer(account.auth.session.token))
      .expect(200)
  })
})
