import { describe, expect, it } from "vitest"

import { PasswordHasher } from "./password-hasher.js"

describe("PasswordHasher", () => {
  const hasher = new PasswordHasher()

  it("hashes with argon2id and verifies the original password only", async () => {
    const passwordHash = await hasher.hash("correct horse battery staple")

    expect(passwordHash).toMatch(/^\$argon2id\$/)

    await expect(
      hasher.verify({ passwordHash, password: "correct horse battery staple" }),
    ).resolves.toBe(true)

    await expect(hasher.verify({ passwordHash, password: "wrong password" })).resolves.toBe(false)
  })

  it("salts every hash", async () => {
    const [first, second] = await Promise.all([hasher.hash("same"), hasher.hash("same")])

    expect(first).not.toBe(second)
  })
})
