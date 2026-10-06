import { ReactionKind } from "@ponto/types"
import { describe, expect, it } from "vitest"

import { exclusiveCounterpart } from "./reaction-rules.js"

describe("exclusiveCounterpart", () => {
  it("makes agree and disagree mutually exclusive", () => {
    expect(exclusiveCounterpart(ReactionKind.AGREE)).toBe(ReactionKind.DISAGREE)

    expect(exclusiveCounterpart(ReactionKind.DISAGREE)).toBe(ReactionKind.AGREE)
  })

  it("lets quality reactions coexist with any other reaction", () => {
    expect(exclusiveCounterpart(ReactionKind.GOOD_ARGUMENT)).toBeUndefined()

    expect(exclusiveCounterpart(ReactionKind.INSIGHTFUL)).toBeUndefined()
  })
})
