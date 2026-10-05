import { describe, expect, it } from "vitest"
import { z } from "zod"

import { apiErrorResponseSchema, isValidRequestId, toValidationIssues } from "./index.js"

describe("toValidationIssues", () => {
  it("flattens zod issues into path and code pairs without leaking input values", () => {
    const schema = z.object({
      profile: z.object({ name: z.string().min(3) }),
      tags: z.array(z.string()),
    })

    const { error } = schema.safeParse({ profile: { name: "ab" }, tags: [1] })

    if (!error) throw new Error("Expected validation to fail")

    expect(toValidationIssues(error)).toEqual([
      { path: "profile.name", code: "too_small" },
      { path: "tags.0", code: "invalid_type" },
    ])
  })
})

describe("isValidRequestId", () => {
  it("accepts UUIDs and opaque trace identifiers", () => {
    expect(isValidRequestId("3f1c2d4e-8b7a-4c6d-9e0f-1a2b3c4d5e6f")).toBe(true)

    expect(isValidRequestId("trace:abc123.def_456")).toBe(true)
  })

  it("rejects values that could pollute logs or headers", () => {
    expect(isValidRequestId("short")).toBe(false)

    expect(isValidRequestId("abc123\ninjected-log-line")).toBe(false)

    expect(isValidRequestId("x".repeat(129))).toBe(false)

    expect(isValidRequestId(undefined)).toBe(false)
  })
})

describe("apiErrorResponseSchema", () => {
  it("rejects error codes outside the public contract", () => {
    const body = { error: { code: "SOMETHING", message: "x", details: null, requestId: null } }

    expect(apiErrorResponseSchema.safeParse(body).success).toBe(false)
  })
})
