import { describe, expect, it } from "vitest"

import { hasRole } from "./roles.js"

describe("hasRole", () => {
  it("grants moderator permissions to admins but not the other way around", () => {
    expect(hasRole({ role: "admin", required: "moderator" })).toBe(true)

    expect(hasRole({ role: "moderator", required: "admin" })).toBe(false)
  })

  it("keeps members out of moderation", () => {
    expect(hasRole({ role: "member", required: "moderator" })).toBe(false)

    expect(hasRole({ role: "member", required: "member" })).toBe(true)
  })
})
