import type { NestExpressApplication } from "@nestjs/platform-express"
import { privateProfileSchema, publicProfileSchema } from "@ponto/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { bearer, registerAccount, type App } from "./support/accounts.js"
import { createTestApp } from "./support/create-test-app.js"

describe("users", () => {
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

  describe("own profile", () => {
    it("updates display name, bio and locale", async () => {
      const { auth } = await registerAccount({ server })

      const response = await request(server)
        .patch("/api/v1/users/me")
        .set(bearer(auth.session.token))
        .send({ displayName: "  Ana Souza ", bio: "Gosto de bons argumentos.", locale: "es" })
        .expect(200)

      expect(privateProfileSchema.parse(response.body)).toMatchObject({
        displayName: "Ana Souza",
        bio: "Gosto de bons argumentos.",
        locale: "es",
      })
    })

    it("clears the bio with a blank value and ignores fields that cannot be edited here", async () => {
      const { auth } = await registerAccount({ server })

      await request(server)
        .patch("/api/v1/users/me")
        .set(bearer(auth.session.token))
        .send({ bio: "temporária" })
        .expect(200)

      const response = await request(server)
        .patch("/api/v1/users/me")
        .set(bearer(auth.session.token))
        .send({ bio: "   ", email: "hijack@example.com", handle: "hijacked" })
        .expect(200)

      expect(response.body).toMatchObject({
        bio: null,
        email: auth.user.email,
        handle: auth.user.handle,
      })
    })

    it("rejects an empty update", async () => {
      const { auth } = await registerAccount({ server })

      const response = await request(server)
        .patch("/api/v1/users/me")
        .set(bearer(auth.session.token))
        .send({})
        .expect(400)

      expect(response.body.error.code).toBe("VALIDATION_FAILED")
    })
  })

  describe("public profile", () => {
    it("is readable without a session and hides private fields", async () => {
      const { auth } = await registerAccount({ server })

      const response = await request(server)
        .get(`/api/v1/users/${auth.user.handle.toUpperCase()}`)
        .expect(200)

      expect(publicProfileSchema.strict().parse(response.body)).toEqual({
        id: auth.user.id,
        handle: auth.user.handle,
        displayName: auth.user.displayName,
        bio: null,
        createdAt: auth.user.createdAt,
      })
    })

    it("responds 404 for unknown handles and 400 for malformed ones", async () => {
      const missing = await request(server).get("/api/v1/users/nobody_by_this_name").expect(404)
      const malformed = await request(server).get("/api/v1/users/not.valid").expect(400)

      expect(missing.body.error.code).toBe("RESOURCE_NOT_FOUND")

      expect(malformed.body.error.code).toBe("VALIDATION_FAILED")
    })
  })
})
