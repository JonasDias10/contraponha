import { describe, expect, it } from "vitest"

import { escapeLikePattern, periodStart } from "./search-pagination.js"

describe("escapeLikePattern", () => {
  it("escapes LIKE wildcards and the escape character", () => {
    expect(escapeLikePattern("50%_off\\")).toBe("50\\%\\_off\\\\")
  })
})

describe("periodStart", () => {
  const now = new Date("2026-10-06T12:00:00Z")

  it("has no lower bound for any date", () => {
    expect(periodStart({ period: "any", now })).toBeNull()
  })

  it("goes back the length of the period", () => {
    expect(periodStart({ period: "week", now })).toEqual(new Date("2026-09-29T12:00:00Z"))
  })
})
