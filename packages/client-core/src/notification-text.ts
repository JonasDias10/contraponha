import type { Translate } from "@contraponha/i18n"
import type { NotificationView } from "@contraponha/types"

const GROUPED_TYPES = new Set([
  "post_commented",
  "post_reacted",
  "comment_reacted",
  "user_followed",
  "source_requested",
])

export interface NotificationTextParams {
  notification: NotificationView
  t: Translate
}

function actorsText({ notification, t }: NotificationTextParams): string {
  const [first, second] = notification.actors.map(
    ({ displayName }) => displayName || t("web.common.deletedAccount"),
  )

  const others = notification.actorCount - notification.actors.length

  if (!first) return t("web.common.deletedAccount")

  if (!second) return first

  if (others > 0) return t("web.notifications.actorsMore", { first, second, count: others })

  return t("web.notifications.actorsTwo", { first, second })
}

// One sentence per notification, with the people involved ("Bianca, Diego e mais 4").
export function notificationText({ notification, t }: NotificationTextParams): string {
  const { type, moderation } = notification
  const rule = moderation?.rule ? t(`web.rules.${moderation.rule}`) : null

  if (type === "content_removed") {
    return rule
      ? t("web.notifications.content_removed", { rule })
      : t("web.notifications.content_removed_no_rule")
  }

  if (type === "report_resolved") {
    return moderation?.wasRemoved && rule
      ? t("web.notifications.report_resolved_removed", { rule })
      : t("web.notifications.report_resolved_kept")
  }

  const actors = actorsText({ notification, t })
  const isMany = notification.actorCount > 1 && GROUPED_TYPES.has(type)

  switch (type) {
    case "post_commented":
      return isMany
        ? t("web.notifications.post_commented_many", { actors })
        : t("web.notifications.post_commented", { actors })
    case "post_reacted":
      return isMany
        ? t("web.notifications.post_reacted_many", { actors })
        : t("web.notifications.post_reacted", { actors })
    case "comment_reacted":
      return isMany
        ? t("web.notifications.comment_reacted_many", { actors })
        : t("web.notifications.comment_reacted", { actors })
    case "user_followed":
      return isMany
        ? t("web.notifications.user_followed_many", { actors })
        : t("web.notifications.user_followed", { actors })
    case "source_requested":
      return isMany
        ? t("web.notifications.source_requested_many", { actors })
        : t("web.notifications.source_requested", { actors })
    case "comment_replied":
      return t("web.notifications.comment_replied", { actors })
    case "mentioned":
      return t("web.notifications.mentioned", { actors })
    case "comment_highlighted":
      return t("web.notifications.comment_highlighted", { actors })
  }
}

export type NotificationPeriod = "today" | "thisWeek" | "earlier"

const DAY_MS = 24 * 60 * 60 * 1000

export interface PeriodOfParams {
  createdAt: string
  now: Date
}

export function periodOf({ createdAt, now }: PeriodOfParams): NotificationPeriod {
  const startOfToday = new Date(now)

  startOfToday.setHours(0, 0, 0, 0)

  const time = new Date(createdAt).getTime()

  if (time >= startOfToday.getTime()) return "today"

  if (time >= startOfToday.getTime() - 6 * DAY_MS) return "thisWeek"

  return "earlier"
}
