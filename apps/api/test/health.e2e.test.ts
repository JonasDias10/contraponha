import type { NestExpressApplication } from "@nestjs/platform-express"
import { livenessReportSchema, readinessReportSchema } from "@ponto/validation"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { createTestApp } from "./support/create-test-app.js"

describe("health endpoints", () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    const testApp = await createTestApp()

    app = testApp.app
  })

  afterAll(async () => {
    await app.close()
  })

  it("GET /api/v1/health/live reports the process as up", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health/live").expect(200)

    expect(livenessReportSchema.parse(response.body).status).toBe("up")
  })

  it("GET /api/v1/health/ready reaches PostgreSQL and Redis", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health/ready").expect(200)
    const report = readinessReportSchema.parse(response.body)

    expect(report.status).toBe("up")

    expect(report.checks.database?.status).toBe("up")

    expect(report.checks.redis?.status).toBe("up")
  })

  it("is not served without the version prefix", async () => {
    await request(app.getHttpServer()).get("/health/live").expect(404)
  })
})

describe("readiness with an unreachable dependency", () => {
  let app: NestExpressApplication

  beforeAll(async () => {
    const testApp = await createTestApp({ REDIS_URL: "redis://127.0.0.1:1" })

    app = testApp.app
  })

  afterAll(async () => {
    await app.close()
  })

  it("responds 503 using the standard error envelope", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health/ready").expect(503)

    expect(response.body.error.code).toBe("SERVICE_UNAVAILABLE")

    expect(response.body.error.details.checks.database.status).toBe("up")

    expect(response.body.error.details.checks.redis.status).toBe("down")
  })
})
