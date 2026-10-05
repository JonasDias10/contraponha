import { describe, expect, it } from "vitest"

import { daysToMs, hoursToMs, minutesToMs, msToSeconds, secondsToMs } from "./time.js"

describe("time conversions", () => {
  it("converts larger units to milliseconds", () => {
    expect(secondsToMs(2)).toBe(2_000)

    expect(minutesToMs(5)).toBe(300_000)

    expect(hoursToMs(24)).toBe(86_400_000)

    expect(daysToMs(30)).toBe(2_592_000_000)
  })

  it("rounds milliseconds down to whole seconds, as Redis TTLs expect", () => {
    expect(msToSeconds(1_999)).toBe(1)

    expect(msToSeconds(999)).toBe(0)
  })
})
