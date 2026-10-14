import { randomBytes } from "node:crypto"

import { describe, expect, it } from "vitest"

import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "./two-factor.js"

describe("two-factor secrets", () => {
  const key = randomBytes(32)

  it("round-trips through encryption and never stores the secret in clear", () => {
    const ciphertext = encryptSecret({ secret: "JBSWY3DPEHPK3PXP", key })

    expect(ciphertext).not.toContain("JBSWY3DPEHPK3PXP")

    expect(decryptSecret({ ciphertext, key })).toBe("JBSWY3DPEHPK3PXP")
  })

  it("refuses a ciphertext under another key", () => {
    const ciphertext = encryptSecret({ secret: "JBSWY3DPEHPK3PXP", key })

    expect(() => decryptSecret({ ciphertext, key: randomBytes(32) })).toThrow()
  })
})

describe("recovery codes", () => {
  it("makes ten distinct readable codes and hashes them case-insensitively", () => {
    const codes = generateRecoveryCodes()

    expect(new Set(codes).size).toBe(10)

    for (const code of codes) expect(code).toMatch(/^[a-z2-7]{4}-[a-z2-7]{4}-[a-z2-7]{4}$/)

    const [first = ""] = codes

    expect(hashRecoveryCode(first.toUpperCase())).toBe(hashRecoveryCode(first))
  })
})
