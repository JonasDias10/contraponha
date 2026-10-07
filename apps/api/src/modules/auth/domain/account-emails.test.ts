import { describe, expect, it } from "vitest"

import { buildEmailVerificationEmail, buildPasswordResetEmail } from "./account-emails.js"

describe("account emails", () => {
  it("renders the verification email in the recipient's language", () => {
    const email = buildEmailVerificationEmail({
      recipient: {
        to: "ana@example.com",
        name: "Ana",
        locale: "en",
        link: "https://contraponha.test/v?token=abc",
        webAppUrl: "https://contraponha.test",
      },
      ttlHours: 24,
    })

    expect(email.subject).toBe("Confirm your email on Contraponha")

    expect(email.text).toContain("Hi, Ana!")

    expect(email.text).toContain("valid for 24 hours")

    expect(email.html).toContain('href="https://contraponha.test/v?token=abc"')

    expect(email.html).toContain(">Confirm email</a>")

    expect(email.html).toContain('src="https://contraponha.test/brand/symbol.png"')
  })

  it("escapes user-controlled content in HTML", () => {
    const email = buildPasswordResetEmail({
      recipient: {
        to: "x@example.com",
        name: '<img src=x onerror="alert(1)">',
        locale: "pt-BR",
        link: "https://contraponha.test/r",
        webAppUrl: "https://contraponha.test",
      },
      ttlMinutes: 30,
    })

    expect(email.subject).toBe("Redefinição de senha do Contraponha")

    expect(email.html).not.toContain("<img src=x")

    expect(email.html).toContain("&lt;img")
  })
})
