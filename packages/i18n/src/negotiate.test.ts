import { describe, expect, it } from "vitest"

import { negotiateLocale } from "./negotiate.js"

describe("negotiateLocale", () => {
  it("returns the default locale when the header is missing", () => {
    expect(negotiateLocale({ acceptLanguage: undefined })).toBe("pt-BR")
  })

  it("honors quality weights and matches by language", () => {
    expect(negotiateLocale({ acceptLanguage: "fr;q=0.9, en-US;q=0.8, es;q=0.5" })).toBe("en")

    expect(negotiateLocale({ acceptLanguage: "pt" })).toBe("pt-BR")
  })

  it("only returns locales that are enabled", () => {
    expect(negotiateLocale({ acceptLanguage: "es", supported: ["pt-BR", "en"] })).toBe("pt-BR")
  })
})
