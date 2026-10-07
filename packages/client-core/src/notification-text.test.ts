import { createTranslator } from "@contraponha/i18n"
import type { NotificationView, PublicProfile } from "@contraponha/types"
import { describe, expect, it } from "vitest"

import { notificationText, periodOf } from "./notification-text.js"

const t = createTranslator({ locale: "pt-BR" })

function person(displayName: string): PublicProfile {
  return {
    id: displayName,
    handle: displayName.toLowerCase(),
    displayName,
    bio: null,
    headline: null,
    location: null,
    website: null,
    pronouns: null,
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    isDeleted: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  }
}

function notification(overrides: Partial<NotificationView>): NotificationView {
  return {
    id: "n1",
    type: "user_followed",
    actors: [],
    actorCount: 1,
    post: null,
    commentId: null,
    commentExcerpt: null,
    moderation: null,
    isRead: false,
    createdAt: "2026-10-06T12:00:00.000Z",
    ...overrides,
  }
}

describe("notificationText", () => {
  it("names two people and counts the rest", () => {
    const text = notificationText({
      notification: notification({ actors: [person("Bianca"), person("Diego")], actorCount: 6 }),
      t,
    })

    expect(text).toBe("Bianca, Diego e mais 4 começaram a seguir você.")
  })

  it("explains moderation with the rule applied", () => {
    const text = notificationText({
      notification: notification({
        type: "content_removed",
        moderation: { rule: "spam", wasRemoved: true },
      }),
      t,
    })

    expect(text).toBe("Removemos um conteúdo seu por violar a regra Spam.")
  })
})

describe("periodOf", () => {
  it("groups by today, this week and earlier", () => {
    const now = new Date("2026-10-06T15:00:00")

    expect(periodOf({ createdAt: "2026-10-06T08:00:00", now })).toBe("today")

    expect(periodOf({ createdAt: "2026-10-02T08:00:00", now })).toBe("thisWeek")

    expect(periodOf({ createdAt: "2026-09-01T08:00:00", now })).toBe("earlier")
  })
})
