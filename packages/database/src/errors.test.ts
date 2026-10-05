import { describe, expect, it } from "vitest"

import { getUniqueViolationConstraint } from "./errors.js"

describe("getUniqueViolationConstraint", () => {
  it("finds the violated constraint through wrapped errors", () => {
    const pgError = Object.assign(new Error("duplicate key"), {
      code: "23505",
      constraint: "users_email_unique",
    })

    const drizzleError = new Error("Failed query", { cause: pgError })

    expect(getUniqueViolationConstraint(drizzleError)).toBe("users_email_unique")
  })

  it("ignores other database errors", () => {
    const fkError = Object.assign(new Error("fk"), { code: "23503", constraint: "x" })

    expect(getUniqueViolationConstraint(fkError)).toBeUndefined()

    expect(getUniqueViolationConstraint(new Error("boom"))).toBeUndefined()
  })
})
