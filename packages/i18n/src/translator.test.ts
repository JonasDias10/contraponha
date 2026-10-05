import { describe, expect, it } from "vitest"

import { createTranslator } from "./translator.js"

describe("createTranslator", () => {
  it("translates keys using the requested locale", () => {
    expect(createTranslator({ locale: "pt-BR" })("common.errors.notFound")).toBe(
      "O recurso solicitado não foi encontrado.",
    )

    expect(createTranslator({ locale: "en" })("common.errors.notFound")).toBe(
      "The requested resource was not found.",
    )
  })

  it("falls back to the fallback locale when a key is not translated", () => {
    const t = createTranslator({
      locale: "es",
      catalogs: {
        "pt-BR": { common: { errors: { notFound: "Não encontrado" } } },
        es: { common: { errors: {} } },
      },
    })

    expect(t("common.errors.notFound")).toBe("Não encontrado")
  })

  it("interpolates params and keeps unknown placeholders intact", () => {
    const t = createTranslator({
      locale: "pt-BR",
      catalogs: {
        "pt-BR": { common: { errors: { notFound: "{resource} não encontrado {other}" } } },
      },
    })

    expect(t("common.errors.notFound", { resource: "Post" })).toBe("Post não encontrado {other}")
  })
})
