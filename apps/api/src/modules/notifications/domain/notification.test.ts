import { describe, expect, it } from "vitest"

import { DEFAULT_NOTIFICATION_PREFERENCES, isWanted, nextDigestAt } from "./notification.js"

describe("nextDigestAt", () => {
  const timeZone = "America/Sao_Paulo"

  it("delivers right away when no digest hours are chosen", () => {
    const now = new Date("2026-10-06T15:30:00Z")

    expect(nextDigestAt({ now, hours: [], timeZone })).toEqual(now)
  })

  it("waits for the next chosen hour in the person's time zone", () => {
    // 12:30 in São Paulo (UTC-3); the next slot is 19:00 local, 22:00 UTC.
    const now = new Date("2026-10-06T15:30:20Z")

    expect(nextDigestAt({ now, hours: [9, 19], timeZone })).toEqual(
      new Date("2026-10-06T22:00:00Z"),
    )
  })

  it("rolls over to the first slot of the next day", () => {
    // 20:00 local; next slot is 09:00 local tomorrow, 12:00 UTC.
    const now = new Date("2026-10-06T23:00:00Z")

    expect(nextDigestAt({ now, hours: [9, 19], timeZone })).toEqual(
      new Date("2026-10-07T12:00:00Z"),
    )
  })
})

describe("isWanted", () => {
  it("follows the preference switch and always lets moderation through", () => {
    const preferences = { ...DEFAULT_NOTIFICATION_PREFERENCES, replies: false }

    expect(isWanted({ type: "comment_replied", preferences })).toBe(false)

    expect(isWanted({ type: "post_reacted", preferences })).toBe(false)

    expect(isWanted({ type: "content_removed", preferences })).toBe(true)
  })
})
