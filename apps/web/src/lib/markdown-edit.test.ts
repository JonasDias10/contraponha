import { describe, expect, it } from "vitest"

import { applyMarkdown } from "./markdown-edit"

describe("applyMarkdown", () => {
  it("wraps the selection in bold markers and keeps it selected", () => {
    const result = applyMarkdown({
      selection: { value: "um dado novo", start: 3, end: 7 },
      action: "bold",
      linkPlaceholder: "texto",
    })

    expect(result).toEqual({ value: "um **dado** novo", selectionStart: 5, selectionEnd: 9 })
  })

  it("turns every selected line into a quote", () => {
    const result = applyMarkdown({
      selection: { value: "a\nb\nc", start: 2, end: 5 },
      action: "quote",
      linkPlaceholder: "texto",
    })

    expect(result.value).toBe("a\n> b\n> c")
  })
})
