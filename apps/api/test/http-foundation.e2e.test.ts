import type { NestExpressApplication } from "@nestjs/platform-express"
import { apiErrorResponseSchema } from "@ponto/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestApp } from "./support/create-test-app.js"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe("HTTP foundation", () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    app = await createTestApp({ RATE_LIMIT_MAX_REQUESTS: "3", RATE_LIMIT_TTL_SECONDS: "60" })
  })

  afterAll(async () => {
    await app.close()
  })

  describe("request id", () => {
    it("generates one when the client does not send it", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health/live")

      expect(response.headers["x-request-id"]).toMatch(UUID_PATTERN)
    })

    it("reuses a valid client-provided id", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/health/live")
        .set("X-Request-ID", "client-trace-0001")

      expect(response.headers["x-request-id"]).toBe("client-trace-0001")
    })

    it("replaces an invalid client-provided id", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/health/live")
        .set("X-Request-ID", "bad id")

      expect(response.headers["x-request-id"]).toMatch(UUID_PATTERN)
    })
  })

  describe("error envelope", () => {
    it("localizes messages for unknown routes, defaulting to pt-BR", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/does-not-exist").expect(404)
      const { error } = apiErrorResponseSchema.parse(response.body)

      expect(error.code).toBe("RESOURCE_NOT_FOUND")
      expect(error.message).toBe("O recurso solicitado não foi encontrado.")
      expect(error.requestId).toBe(response.headers["x-request-id"])
      expect(response.headers["content-language"]).toBe("pt-BR")
    })

    it("honors Accept-Language", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/does-not-exist")
        .set("Accept-Language", "en-US,en;q=0.9")
        .expect(404)

      expect(response.body.error.message).toBe("The requested resource was not found.")
      expect(response.headers["content-language"]).toBe("en")
    })

    it("reports validation failures with field-level details", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/probe")
        .send({ title: "" })
        .expect(400)

      expect(response.body.error).toMatchObject({
        code: "VALIDATION_FAILED",
        details: [{ path: "title", code: "too_small" }],
      })
    })

    it("accepts valid input", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/probe")
        .send({ title: "  Bons argumentos  " })
        .expect(201, { title: "Bons argumentos" })
    })

    it("handles malformed JSON with the same envelope", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/probe")
        .set("Content-Type", "application/json")
        .send('{"title":')
        .expect(400)

      expect(response.body.error.code).toBe("BAD_REQUEST")
    })

    it("hides internal details of unexpected errors", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/probe/failure").expect(500)

      expect(response.body).toEqual({
        error: {
          code: "INTERNAL_ERROR",
          message: "Ocorreu um erro inesperado. Tente novamente mais tarde.",
          details: null,
          requestId: response.headers["x-request-id"],
        },
      })
      expect(JSON.stringify(response.body)).not.toContain("postgres://")
    })
  })

  describe("security", () => {
    it("sets hardening headers and hides the framework", async () => {
      const response = await request(app.getHttpServer()).get("/api/v1/health/live")

      expect(response.headers["x-content-type-options"]).toBe("nosniff")
      expect(response.headers["x-powered-by"]).toBeUndefined()
    })

    it("rate limits regular endpoints", async () => {
      const server = app.getHttpServer()
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await request(server).get("/api/v1/probe/limited").expect(200)
      }
      const response = await request(server).get("/api/v1/probe/limited").expect(429)

      expect(response.body.error.code).toBe("RATE_LIMIT_EXCEEDED")
    })
  })

  it("serves the OpenAPI document", async () => {
    const response = await request(app.getHttpServer()).get("/api/docs-json").expect(200)
    const document = response.body as { paths: Record<string, unknown> }

    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(["/api/v1/health/live", "/api/v1/health/ready"]),
    )
  })
})
