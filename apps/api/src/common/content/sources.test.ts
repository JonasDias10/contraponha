import { describe, expect, it } from "vitest"

import { extractMentionHandles, toExcerpt, toSourceViews } from "./sources.js"

describe("toSourceViews", () => {
  it("derives the host without www", () => {
    const [view] = toSourceViews([{ url: "https://www.ibge.gov.br/estatisticas", title: null }])

    expect(view?.host).toBe("ibge.gov.br")
  })
})

describe("extractMentionHandles", () => {
  it("finds handles once, lowercased, ignoring emails", () => {
    const text = "Concordo com @Luana_F e @rtanaka. Escreva para joao@exemplo.com ou @luana_f"

    expect(extractMentionHandles(text)).toEqual(["luana_f", "rtanaka"])
  })
})

describe("toExcerpt", () => {
  it("flattens whitespace and cuts long texts", () => {
    const excerpt = toExcerpt(`Primeira linha\n\n${"a".repeat(300)}`)

    expect(excerpt?.startsWith("Primeira linha a")).toBe(true)

    expect(excerpt?.endsWith("…")).toBe(true)

    expect(excerpt?.length).toBe(160)
  })
})
