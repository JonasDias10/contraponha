import { describe, expect, it } from "vitest"

import { toRecognition } from "./recognition.js"

const topics = [
  { slug: "cidades", name: "Cidades", isCurated: true },
  { slug: "mobilidade-urbana", name: "Mobilidade urbana", isCurated: true },
  { slug: "clima", name: "Clima", isCurated: false },
]

describe("toRecognition", () => {
  it("says nothing until enough quality reactions arrive", () => {
    expect(toRecognition({ received: { goodArgument: 5, insightful: 4 }, topics })).toBeNull()
  })

  it("names the stronger kind and at most two topics", () => {
    const recognition = toRecognition({ received: { goodArgument: 4, insightful: 12 }, topics })

    expect(recognition?.kind).toBe("insightful")

    expect(recognition?.topics.map(({ slug }) => slug)).toEqual(["cidades", "mobilidade-urbana"])
  })
})
