import { describe, expect, it } from "vitest"

import { buildEmailVerificationEmail, buildPasswordResetEmail } from "./account-emails.js"

describe("account emails", () => {
  it("renders the verification email in the recipient's language", () => {
    const email = buildEmailVerificationEmail(
      { to: "ana@example.com", name: "Ana", locale: "en", link: "https://ponto.test/v?token=abc" },
      24,
    )

    expect(email.subject).toBe("Confirm your email on Ponto")
    expect(email.text).toContain("Hi, Ana!")
    expect(email.text).toContain("valid for 24 hours")
    expect(email.html).toContain('<a href="https://ponto.test/v?token=abc">')
  })

  it("escapes user-controlled content in HTML", () => {
    const email = buildPasswordResetEmail(
      {
        to: "x@example.com",
        name: '<img src=x onerror="alert(1)">',
        locale: "pt-BR",
        link: "https://ponto.test/r",
      },
      30,
    )

    expect(email.subject).toBe("Redefinição de senha do Ponto")
    expect(email.html).not.toContain("<img")
    expect(email.html).toContain("&lt;img")
  })
})
