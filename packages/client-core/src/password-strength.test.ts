import { describe, expect, it } from "vitest"

import { passwordStrength } from "./password-strength.js"

describe("passwordStrength", () => {
  it("rates short passwords as weak and long varied ones as strong", () => {
    expect(passwordStrength("abc123")).toBe("weak")

    expect(passwordStrength("abcdefghij")).toBe("fair")

    expect(passwordStrength("correct horse battery")).toBe("strong")
  })
})
