import { createTranslator } from "@contraponha/i18n"
import { describe, expect, it } from "vitest"

import { handleFieldMessages } from "./handle-field.js"

const t = createTranslator({ locale: "en" })

describe("handleFieldMessages", () => {
  it("keeps the format hint while idle", () => {
    expect(handleFieldMessages({ availability: { status: "idle", handle: "" }, t })).toEqual({
      hint: t("web.auth.handleHint"),
    })
  })

  it("says it is checking while the request is pending", () => {
    expect(handleFieldMessages({ availability: { status: "checking", handle: "ana" }, t })).toEqual(
      { hint: "Checking availability..." },
    )
  })

  it("flags a taken handle as an error", () => {
    expect(handleFieldMessages({ availability: { status: "taken", handle: "ana" }, t }).error).toBe(
      "This username is not available.",
    )
  })

  it("confirms an available handle by name", () => {
    expect(
      handleFieldMessages({ availability: { status: "available", handle: "ana" }, t }).success,
    ).toBe("@ana is available.")
  })
})
