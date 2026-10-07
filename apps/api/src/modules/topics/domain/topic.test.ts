import { describe, expect, it } from "vitest"

import { slugifyTopic } from "./topic.js"

describe("slugifyTopic", () => {
  it("removes accents and joins words with dashes", () => {
    expect(slugifyTopic("Clima e Amazônia")).toBe("clima-e-amazonia")
  })

  it("lowercases hashtags and drops punctuation", () => {
    expect(slugifyTopic("TarifaZero!")).toBe("tarifazero")

    expect(slugifyTopic("  São Paulo / SP ")).toBe("sao-paulo-sp")
  })

  it("returns an empty slug when nothing usable is left", () => {
    expect(slugifyTopic("!!!")).toBe("")
  })
})
