import { describe, expect, it } from "vitest"

import { formatIsoDate, maskDateInput, parseDateInput } from "./date-input"

describe("maskDateInput", () => {
  it("inserts slashes while typing and ignores other characters", () => {
    expect(maskDateInput("2705")).toBe("27/05")

    expect(maskDateInput("27-05-2001x")).toBe("27/05/2001")
  })

  it("stops at eight digits", () => {
    expect(maskDateInput("270520019")).toBe("27/05/2001")
  })
})

describe("parseDateInput", () => {
  it("reads day first or month first", () => {
    expect(parseDateInput({ text: "27/05/2001", order: "dmy" })).toBe("2001-05-27")

    expect(parseDateInput({ text: "05/27/2001", order: "mdy" })).toBe("2001-05-27")
  })

  it("rejects incomplete and impossible dates", () => {
    expect(parseDateInput({ text: "27/05/20", order: "dmy" })).toBe("")

    expect(parseDateInput({ text: "31/02/2001", order: "dmy" })).toBe("")
  })
})

describe("formatIsoDate", () => {
  it("formats for the reader's order", () => {
    expect(formatIsoDate({ iso: "2001-05-27", order: "dmy" })).toBe("27/05/2001")

    expect(formatIsoDate({ iso: "2001-05-27", order: "mdy" })).toBe("05/27/2001")
  })
})
