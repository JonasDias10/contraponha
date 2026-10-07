import { describe, expect, it } from "vitest"

import {
  createPostInputSchema,
  httpUrlSchema,
  registerInputSchema,
  updateProfileInputSchema,
} from "./index.js"

describe("registerInputSchema", () => {
  it("normalizes email and handle so uniqueness is case-insensitive", () => {
    const input = registerInputSchema.parse({
      email: "  Maria.Silva@Example.COM ",
      password: "correct horse battery",
      handle: " Maria_Silva ",
      displayName: " Maria Silva ",
      birthDate: "1991-08-14",
      acceptedTerms: true,
    })

    expect(input).toEqual({
      email: "maria.silva@example.com",
      password: "correct horse battery",
      handle: "maria_silva",
      displayName: "Maria Silva",
      birthDate: "1991-08-14",
      acceptedTerms: true,
    })
  })

  it("rejects weak passwords and handles outside the allowed alphabet", () => {
    const result = registerInputSchema.safeParse({
      email: "maria@example.com",
      password: "short",
      handle: "maria.silva",
      displayName: "Maria",
      birthDate: "1991-08-14",
      acceptedTerms: true,
    })

    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      "password",
      "handle",
    ])
  })
})

describe("birth date and terms", () => {
  it("requires people to be at least 16 and to accept the terms", () => {
    const result = registerInputSchema.safeParse({
      email: "maria@example.com",
      password: "correct horse battery",
      handle: "maria",
      displayName: "Maria",
      birthDate: `${new Date().getUTCFullYear() - 15}-01-01`,
      acceptedTerms: false,
    })

    expect(result.error?.issues.map((issue) => issue.path.join("."))).toEqual([
      "birthDate",
      "acceptedTerms",
    ])
  })
})

describe("sources and topics", () => {
  it("accepts only http links as sources and strips hashes from topics", () => {
    const valid = createPostInputSchema.parse({
      body: "Texto",
      sources: [{ url: "https://ibge.gov.br", title: "  " }],
      topics: ["#TarifaZero"],
    })

    const invalid = createPostInputSchema.safeParse({
      body: "Texto",
      sources: [{ url: "javascript:alert(1)" }],
    })

    expect(valid.sources).toEqual([{ url: "https://ibge.gov.br", title: null }])

    expect(valid.topics).toEqual(["TarifaZero"])

    expect(invalid.success).toBe(false)
  })

  it("rejects an empty link without throwing", () => {
    expect(httpUrlSchema.safeParse("").success).toBe(false)
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
