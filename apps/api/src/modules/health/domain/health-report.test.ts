import { describe, expect, it } from "vitest"

import { buildReadinessReport } from "./health-report.js"

const now = new Date("2026-10-05T12:00:00.000Z")

describe("buildReadinessReport", () => {
  it("is up only when every dependency is up", () => {
    const report = buildReadinessReport(
      { database: { status: "up", latencyMs: 2 }, redis: { status: "up", latencyMs: 1 } },
      now,
    )

    expect(report).toEqual({
      status: "up",
      checks: { database: { status: "up", latencyMs: 2 }, redis: { status: "up", latencyMs: 1 } },
      timestamp: "2026-10-05T12:00:00.000Z",
    })
  })

  it("is down when any dependency is down", () => {
    const report = buildReadinessReport(
      { database: { status: "up", latencyMs: 2 }, redis: { status: "down", latencyMs: 2000 } },
      now,
    )

    expect(report.status).toBe("down")
  })
})
