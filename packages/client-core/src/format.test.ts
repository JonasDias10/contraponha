import { describe, expect, it } from "vitest"

import { formatCount, formatRelativeDate, readingMinutes } from "./format.js"

describe("formatRelativeDate", () => {
  const now = new Date("2026-10-06T15:00:00Z")

  it("uses relative time within a week", () => {
    expect(formatRelativeDate({ value: "2026-10-06T14:20:00Z", locale: "pt-BR", now })).toBe(
      "há 40 min.",
    )
  })

  it("shows the date after a week", () => {
    expect(formatRelativeDate({ value: "2026-08-12T10:00:00Z", locale: "pt-BR", now })).toBe(
      "12 de ago.",
    )
  })
})

describe("formatCount", () => {
  it("abbreviates large numbers in the reader's language", () => {
    expect(formatCount({ value: 2400, locale: "pt-BR" })).toMatch(/^2,4\smil$/)
  })
})

describe("readingMinutes", () => {
  it("never says zero minutes", () => {
    expect(readingMinutes("curto")).toBe(1)
  })
})
