import { opaqueTokenSchema } from "@ponto/validation"
import { describe, expect, it } from "vitest"

import { generateOpaqueToken, hashOpaqueToken } from "./opaque-token.js"

describe("opaque tokens", () => {
  it("generates unique tokens that satisfy the shared token schema", () => {
    const tokens = new Set(Array.from({ length: 100 }, generateOpaqueToken))

    expect(tokens.size).toBe(100)

    for (const token of tokens) expect(opaqueTokenSchema.safeParse(token).success).toBe(true)
  })

  it("hashes deterministically without exposing the token", () => {
    const token = generateOpaqueToken()

    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token))

    expect(hashOpaqueToken(token)).toMatch(/^[0-9a-f]{64}$/)

    expect(hashOpaqueToken(token)).not.toContain(token)
  })
})
