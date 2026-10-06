import { CONTENT_EDIT_WINDOW_MINUTES, minutesToMs } from "@ponto/config"
import { describe, expect, it } from "vitest"

import { isWithinEditWindow } from "./edit-window.js"

const createdAt = new Date("2026-10-05T12:00:00.000Z")

function minutesAfterCreation(minutes: number): Date {
  return new Date(createdAt.getTime() + minutesToMs(minutes))
}

describe("isWithinEditWindow", () => {
  it("allows edits up to the end of the window, inclusive", () => {
    expect(isWithinEditWindow({ createdAt, now: minutesAfterCreation(1) })).toBe(true)

    expect(
      isWithinEditWindow({ createdAt, now: minutesAfterCreation(CONTENT_EDIT_WINDOW_MINUTES) }),
    ).toBe(true)
  })

  it("rejects edits after the window closes", () => {
    const justAfter = new Date(minutesAfterCreation(CONTENT_EDIT_WINDOW_MINUTES).getTime() + 1)

    expect(isWithinEditWindow({ createdAt, now: justAfter })).toBe(false)
  })
})
