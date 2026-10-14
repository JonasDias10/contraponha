import { describe, expect, it } from "vitest"

import { parseOpenGraph } from "./open-graph.js"

describe("parseOpenGraph", () => {
  it("reads Open Graph tags and resolves a relative image", () => {
    const html = `<!doctype html><html><head>
      <title>Fallback</title>
      <meta property="og:title" content="Reforma &amp; impostos">
      <meta property="og:description" content="  Um texto
        longo  ">
      <meta property="og:site_name" content="Jornal">
      <meta property="og:image" content="/img/capa.jpg">
    </head><body><meta property="og:title" content="ignored"></body></html>`

    expect(parseOpenGraph({ html, pageUrl: "https://jornal.example/a/b" })).toEqual({
      title: "Reforma & impostos",
      description: "Um texto longo",
      siteName: "Jornal",
      imageUrl: "https://jornal.example/img/capa.jpg",
    })
  })

  it("falls back to the title tag and meta description", () => {
    const html = `<head><title>Só o título</title><meta name="description" content="Resumo"></head>`

    expect(parseOpenGraph({ html, pageUrl: "https://site.example" })).toMatchObject({
      title: "Só o título",
      description: "Resumo",
      imageUrl: null,
    })
  })

  it("ignores images that are not http(s)", () => {
    const html = `<head><meta property="og:image" content="javascript:alert(1)"></head>`

    expect(parseOpenGraph({ html, pageUrl: "https://site.example" }).imageUrl).toBeNull()
  })
})
