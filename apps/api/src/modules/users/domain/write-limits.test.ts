import { describe, expect, it } from "vitest"

import { WriteAction, writeLimitFor } from "./write-limits.js"

const NOW = new Date("2026-10-14T12:00:00Z")

describe("writeLimitFor", () => {
  it("is lower for accounts younger than a day", () => {
    const young = writeLimitFor({
      action: WriteAction.POST,
      accountCreatedAt: new Date("2026-10-14T08:00:00Z"),
      multiplier: 1,
      now: NOW,
    })

    const older = writeLimitFor({
      action: WriteAction.POST,
      accountCreatedAt: new Date("2026-10-10T08:00:00Z"),
      multiplier: 1,
      now: NOW,
    })

    expect(young).toBeLessThan(older)
  })

  it("scales with the configured multiplier", () => {
    expect(
      writeLimitFor({
        action: WriteAction.COMMENT,
        accountCreatedAt: new Date("2026-01-01"),
        multiplier: 2,
        now: NOW,
      }),
    ).toBe(240)
  })
})
