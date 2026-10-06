import { describe, expect, it } from "vitest"

import { escapeLikePattern } from "./search-pagination.js"

describe("escapeLikePattern", () => {
  it("escapes LIKE wildcards and the escape character itself", () => {
    expect(escapeLikePattern("50%_off\\now")).toBe("50\\%\\_off\\\\now")
  })

  it("leaves ordinary text untouched", () => {
    expect(escapeLikePattern("joão silva")).toBe("joão silva")
  })
})
