import { describe, expect, it } from "vitest"

import { previewUrlOf } from "./preview-url.js"

describe("previewUrlOf", () => {
  it("prefers the first cited source", () => {
    expect(
      previewUrlOf({
        body: "Veja https://outro.example",
        sources: [{ url: "https://fonte.example/estudo", title: null }],
      }),
    ).toBe("https://fonte.example/estudo")
  })

  it("takes the first link in the text without trailing punctuation", () => {
    expect(previewUrlOf({ body: "Li isto: https://site.example/a?b=1.", sources: [] })).toBe(
      "https://site.example/a?b=1",
    )

    expect(previewUrlOf({ body: "[artigo](https://site.example/x)", sources: [] })).toBe(
      "https://site.example/x",
    )
  })

  it("returns null without links", () => {
    expect(previewUrlOf({ body: "Sem links", sources: [] })).toBeNull()
  })
})
