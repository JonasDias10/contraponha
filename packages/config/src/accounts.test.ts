import { describe, expect, it } from "vitest"

import { ageInYears } from "./accounts.js"

describe("ageInYears", () => {
  const today = new Date("2026-10-06T12:00:00Z")

  it("counts a birthday that already happened this year", () => {
    expect(ageInYears({ birthDate: "2010-10-06", today })).toBe(16)
  })

  it("does not count a birthday still to come", () => {
    expect(ageInYears({ birthDate: "2010-10-07", today })).toBe(15)
  })
})
