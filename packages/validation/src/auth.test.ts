import { describe, expect, it } from "vitest"

import { registerInputSchema, updateProfileInputSchema } from "./index.js"

describe("registerInputSchema", () => {
  it("normalizes email and handle so uniqueness is case-insensitive", () => {
    const input = registerInputSchema.parse({
      email: "  Maria.Silva@Example.COM ",
      password: "correct horse battery",
      handle: " Maria_Silva ",
      displayName: " Maria Silva ",
    })

    expect(input).toEqual({
      email: "maria.silva@example.com",
      password: "correct horse battery",
      handle: "maria_silva",
      displayName: "Maria Silva",
    })
  })

  it("rejects weak passwords and handles outside the allowed alphabet", () => {
    const result = registerInputSchema.safeParse({
      email: "maria@example.com",
      password: "short",
      handle: "maria.silva",
      displayName: "Maria",
    })

    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      "password",
      "handle",
    ])
  })
})

describe("updateProfileInputSchema", () => {
  it("turns a blank bio into null so it can be cleared", () => {
    expect(updateProfileInputSchema.parse({ bio: "   " })).toEqual({ bio: null })
  })

  it("requires at least one field", () => {
    expect(updateProfileInputSchema.safeParse({}).success).toBe(false)
  })
})
