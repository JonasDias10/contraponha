import type { NestExpressApplication } from "@nestjs/platform-express"
import {
  createDatabaseConnection,
  passwordCredentials,
  sessions,
  users,
} from "@contraponha/database"
import { sessionListSchema } from "@contraponha/validation"
import { eq } from "drizzle-orm"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest"

import { bearer, login, newAccountInput, registerAccount, type App } from "./support/accounts.js"
import type { CapturingEmailSender } from "./support/capturing-email-sender.js"
import { createTestApp } from "./support/create-test-app.js"

describe("auth", () => {
  let app: NestExpressApplication
  let emails: CapturingEmailSender
  let server: App

  beforeAll(async () => {
    const testApp = await createTestApp()

    app = testApp.app

    emails = testApp.emails

    server = app.getHttpServer()
  })

  afterAll(async () => {
    await app.close()
  })

  describe("handle availability", () => {
    const availability = (handle: string): request.Test =>
      request(server).get(`/api/v1/auth/handles/${encodeURIComponent(handle)}/availability`)

    it("reports a free handle as available", async () => {
      const { handle } = newAccountInput()

      const response = await availability(handle).expect(200)

      expect(response.body).toEqual({ handle, isAvailable: true })
    })

    it("reports a taken handle as unavailable, ignoring case", async () => {
      const { input } = await registerAccount({ server })

      const response = await availability(input.handle.toUpperCase()).expect(200)

      expect(response.body).toEqual({ handle: input.handle, isAvailable: false })
    })

    it("reports reserved handles as unavailable", async () => {
      const response = await availability("admin").expect(200)

      expect(response.body.isAvailable).toBe(false)
    })

    it("rejects malformed handles", async () => {
      await availability("a!").expect(400)
    })
  })

  describe("registration", () => {
    it("creates the account, starts a session and emails a verification link", async () => {
      const { input, auth } = await registerAccount({ server })

      expect(auth.user).toMatchObject({
        email: input.email,
        handle: input.handle,
        displayName: input.displayName,
        isEmailVerified: false,
        locale: "pt-BR",
      })

      await request(server).get("/api/v1/users/me").set(bearer(auth.session.token)).expect(200)

      const email = emails.lastTo(input.email)

      expect(email?.subject).toBe("Confirme seu e-mail no Contraponha")

      expect(email?.text).toContain("http://localhost:3001/verify-email?token=")
    })

    it("uses the requester's language for the account and its emails", async () => {
      const input = newAccountInput()

      const response = await request(server)
        .post("/api/v1/auth/register")
        .set("Accept-Language", "en-US,en;q=0.9")
        .send(input)
        .expect(201)

      expect(response.body.user.locale).toBe("en")

      expect(emails.lastTo(input.email)?.subject).toBe("Confirm your email on Contraponha")
    })

    it("normalizes email and handle before checking uniqueness", async () => {
      const { input } = await registerAccount({ server })

      const sameEmail = await request(server)
        .post("/api/v1/auth/register")
        .send(newAccountInput({ email: input.email.toUpperCase() }))
        .expect(409)

      const sameHandle = await request(server)
        .post("/api/v1/auth/register")
        .send(newAccountInput({ handle: input.handle.toUpperCase() }))
        .expect(409)

      expect(sameEmail.body.error.code).toBe("EMAIL_ALREADY_IN_USE")

      expect(sameHandle.body.error.code).toBe("HANDLE_UNAVAILABLE")
    })

    it("refuses reserved handles", async () => {
      const response = await request(server)
        .post("/api/v1/auth/register")
        .send(newAccountInput({ handle: "admin" }))
        .expect(409)

      expect(response.body.error.code).toBe("HANDLE_UNAVAILABLE")
    })

    it("validates input without echoing the password back", async () => {
      const response = await request(server)
        .post("/api/v1/auth/register")
        .send({
          email: "not-an-email",
          password: "short-pw",
          handle: "a",
          displayName: "",
          birthDate: "2015-01-01",
          acceptedTerms: false,
        })
        .expect(400)

      expect(response.body.error.code).toBe("VALIDATION_FAILED")

      const issues = response.body.error.details as { path: string }[]

      expect(issues.map((issue) => issue.path)).toEqual([
        "email",
        "password",
        "handle",
        "displayName",
        "birthDate",
        "acceptedTerms",
      ])

      expect(JSON.stringify(response.body)).not.toContain("short-pw")
    })

    it("stores only hashes of passwords and session tokens", async () => {
      const { input, auth } = await registerAccount({ server })
      const connection = createDatabaseConnection({ url: inject("testDatabaseUrl") })
      try {
        const [user] = await connection.db.select().from(users).where(eq(users.email, input.email))

        if (!user) throw new Error("User not persisted")

        const [credential] = await connection.db
          .select()
          .from(passwordCredentials)
          .where(eq(passwordCredentials.userId, user.id))

        const userSessions = await connection.db
          .select()
          .from(sessions)
          .where(eq(sessions.userId, user.id))

        expect(credential?.passwordHash).toMatch(/^\$argon2id\$/)

        expect(credential?.passwordHash).not.toContain(input.password)

        expect(userSessions).toHaveLength(1)

        expect(userSessions[0]?.tokenHash).not.toBe(auth.session.token)
      } finally {
        await connection.close()
      }
    })
  })

  describe("login and logout", () => {
    it("logs in with the normalized email", async () => {
      const { input } = await registerAccount({ server })

      const token = await login({
        server,
        email: `  ${input.email.toUpperCase()} `,
        password: input.password,
      })

      await request(server).get("/api/v1/users/me").set(bearer(token)).expect(200)
    })

    it("gives the same answer for a wrong password and an unknown email", async () => {
      const { input } = await registerAccount({ server })

      const wrongPassword = await request(server)
        .post("/api/v1/auth/login")
        .send({ email: input.email, password: "not the password" })
        .expect(401)

      const unknownEmail = await request(server)
        .post("/api/v1/auth/login")
        .send({ email: "nobody@example.com", password: "not the password" })
        .expect(401)

      expect(wrongPassword.body.error.code).toBe("INVALID_CREDENTIALS")

      expect(unknownEmail.body.error).toMatchObject({
        code: wrongPassword.body.error.code,
        message: wrongPassword.body.error.message,
      })
    })

    it("rejects protected routes without a valid session", async () => {
      const missing = await request(server).get("/api/v1/users/me").expect(401)

      await request(server)
        .get("/api/v1/users/me")
        .set(bearer("x".repeat(43)))
        .expect(401)

      await request(server).get("/api/v1/users/me").set("Authorization", "Basic abc").expect(401)

      expect(missing.body.error.code).toBe("UNAUTHORIZED")
    })

    it("invalidates the token immediately on logout, even after it was cached", async () => {
      const { auth } = await registerAccount({ server })
      const token = auth.session.token

      await request(server).get("/api/v1/users/me").set(bearer(token)).expect(200)

      await request(server).post("/api/v1/auth/logout").set(bearer(token)).expect(204)

      await request(server).get("/api/v1/users/me").set(bearer(token)).expect(401)
    })
  })

  describe("session management", () => {
    it("lists sessions and revokes the others", async () => {
      const { input, auth } = await registerAccount({ server })
      const secondToken = await login({ server, email: input.email, password: input.password })

      await request(server).get("/api/v1/users/me").set(bearer(secondToken)).expect(200)

      const listResponse = await request(server)
        .get("/api/v1/auth/sessions")
        .set(bearer(auth.session.token))
        .set("User-Agent", "ContraponhaTest/1.0")
        .expect(200)

      const { sessions: listed } = sessionListSchema.parse(listResponse.body)

      expect(listed).toHaveLength(2)

      expect(listed.filter((session) => session.isCurrent)).toHaveLength(1)

      await request(server)
        .delete("/api/v1/auth/sessions")
        .set(bearer(auth.session.token))
        .expect(204)

      await request(server).get("/api/v1/users/me").set(bearer(secondToken)).expect(401)

      await request(server).get("/api/v1/users/me").set(bearer(auth.session.token)).expect(200)
    })

    it("revokes a single session and does not touch other people's sessions", async () => {
      const owner = await registerAccount({ server })
      const stranger = await registerAccount({ server })

      const otherToken = await login({
        server,
        email: owner.input.email,
        password: owner.input.password,
      })

      const listResponse = await request(server)
        .get("/api/v1/auth/sessions")
        .set(bearer(owner.auth.session.token))
        .expect(200)

      const other = sessionListSchema
        .parse(listResponse.body)
        .sessions.find((session) => !session.isCurrent)

      if (!other) throw new Error("Expected a second session")

      await request(server)
        .delete(`/api/v1/auth/sessions/${other.id}`)
        .set(bearer(stranger.auth.session.token))
        .expect(404)

      await request(server).get("/api/v1/users/me").set(bearer(otherToken)).expect(200)

      await request(server)
        .delete(`/api/v1/auth/sessions/${other.id}`)
        .set(bearer(owner.auth.session.token))
        .expect(204)

      await request(server).get("/api/v1/users/me").set(bearer(otherToken)).expect(401)
    })
  })

  describe("email verification", () => {
    it("verifies the email once with the emailed token", async () => {
      const { input, auth } = await registerAccount({ server })
      const token = emails.tokenSentTo(input.email)

      await request(server)
        .post("/api/v1/auth/email-verification/confirm")
        .send({ token })
        .expect(204)

      const me = await request(server)
        .get("/api/v1/users/me")
        .set(bearer(auth.session.token))
        .expect(200)

      const reuse = await request(server)
        .post("/api/v1/auth/email-verification/confirm")
        .send({ token })
        .expect(400)

      expect(me.body.isEmailVerified).toBe(true)

      expect(reuse.body.error.code).toBe("INVALID_TOKEN")
    })

    it("invalidates the previous link when a new one is requested", async () => {
      const { input, auth } = await registerAccount({ server })
      const firstToken = emails.tokenSentTo(input.email)

      await request(server)
        .post("/api/v1/auth/email-verification")
        .set(bearer(auth.session.token))
        .expect(202)

      const secondToken = emails.tokenSentTo(input.email)

      expect(secondToken).not.toBe(firstToken)

      await request(server)
        .post("/api/v1/auth/email-verification/confirm")
        .send({ token: firstToken })
        .expect(400)

      await request(server)
        .post("/api/v1/auth/email-verification/confirm")
        .send({ token: secondToken })
        .expect(204)
    })
  })

  describe("password reset", () => {
    it("does not reveal whether an email has an account", async () => {
      const sentBefore = emails.messages.length

      await request(server)
        .post("/api/v1/auth/password-reset")
        .send({ email: "nobody-here@example.com" })
        .expect(202)

      expect(emails.messages).toHaveLength(sentBefore)
    })

    it("sets a new password with a single-use token and ends every session", async () => {
      const { input, auth } = await registerAccount({ server })

      await request(server)
        .post("/api/v1/auth/password-reset")
        .send({ email: input.email })
        .expect(202)

      const token = emails.tokenSentTo(input.email)
      const newPassword = "a brand new passphrase"

      await request(server)
        .post("/api/v1/auth/password-reset/confirm")
        .send({ token, newPassword })
        .expect(204)

      await request(server).get("/api/v1/users/me").set(bearer(auth.session.token)).expect(401)

      await request(server)
        .post("/api/v1/auth/login")
        .send({ email: input.email, password: input.password })
        .expect(401)

      await login({ server, email: input.email, password: newPassword })

      const reuse = await request(server)
        .post("/api/v1/auth/password-reset/confirm")
        .send({ token, newPassword: "yet another passphrase" })
        .expect(400)

      expect(reuse.body.error.code).toBe("INVALID_TOKEN")
    })
  })

  describe("password change", () => {
    it("requires the current password and ends the other sessions", async () => {
      const { input, auth } = await registerAccount({ server })
      const otherToken = await login({ server, email: input.email, password: input.password })
      const currentToken = auth.session.token

      const wrong = await request(server)
        .put("/api/v1/auth/password")
        .set(bearer(currentToken))
        .send({ currentPassword: "not it", newPassword: "another good passphrase" })
        .expect(401)

      expect(wrong.body.error.code).toBe("INVALID_CREDENTIALS")

      await request(server)
        .put("/api/v1/auth/password")
        .set(bearer(currentToken))
        .send({ currentPassword: input.password, newPassword: "another good passphrase" })
        .expect(204)

      await request(server).get("/api/v1/users/me").set(bearer(currentToken)).expect(200)

      await request(server).get("/api/v1/users/me").set(bearer(otherToken)).expect(401)

      await login({ server, email: input.email, password: "another good passphrase" })
    })
  })
})

describe("auth rate limiting", () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    const testApp = await createTestApp({ AUTH_RATE_LIMIT_MAX_REQUESTS: "2" })

    app = testApp.app
  })

  afterAll(async () => {
    await app.close()
  })

  it("applies the stricter limit to sensitive routes only", async () => {
    const server = app.getHttpServer()

    const attempt = (): request.Test =>
      request(server)
        .post("/api/v1/auth/login")
        .send({ email: "someone@example.com", password: "whatever" })

    await attempt().expect(401)

    await attempt().expect(401)

    const blocked = await attempt().expect(429)

    expect(blocked.body.error.code).toBe("RATE_LIMIT_EXCEEDED")

    await request(server).get("/api/v1/health/live").expect(200)

    await request(server).get("/api/v1/users/someone_else").expect(404)
  })
})
