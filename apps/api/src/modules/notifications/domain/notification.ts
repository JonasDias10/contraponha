import type {
  CommunityRuleValue,
  ModerationActionRow,
  NotificationPreferencesRow,
  NotificationRow,
  NotificationTypeValue,
} from "@ponto/database"
import type { NotificationPreferences, NotificationView } from "@ponto/types"

import { toExcerpt } from "#src/common/content/sources.js"
import { toPublicProfile, type User } from "#src/modules/users/domain/user.js"

export type Notification = NotificationRow

type PreferenceKey = Exclude<keyof NotificationPreferences, "digestHours">

// Which preference switch controls each type. Moderation decisions have none: they always arrive.
const PREFERENCE_BY_TYPE: Record<NotificationTypeValue, PreferenceKey | null> = {
  post_commented: "replies",
  comment_replied: "replies",
  mentioned: "mentions",
  comment_highlighted: "highlights",
  source_requested: "sourceRequests",
  post_reacted: "reactions",
  comment_reacted: "reactions",
  user_followed: "follows",
  content_removed: null,
  report_resolved: null,
}

// Types where repeated events on the same target fold into one unread notification.
const GROUPABLE_TYPES: ReadonlySet<NotificationTypeValue> = new Set([
  "post_commented",
  "post_reacted",
  "comment_reacted",
  "source_requested",
  "user_followed",
])

export const MODERATION_TYPES: readonly NotificationTypeValue[] = [
  "content_removed",
  "report_resolved",
]

export const MENTION_TYPES: readonly NotificationTypeValue[] = ["mentioned", "comment_replied"]

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  replies: true,
  mentions: true,
  highlights: true,
  sourceRequests: true,
  reactions: false,
  follows: false,
  digestHours: [],
}

export function toNotificationPreferences(
  row: NotificationPreferencesRow | undefined,
): NotificationPreferences {
  if (!row) return DEFAULT_NOTIFICATION_PREFERENCES

  return {
    replies: row.replies,
    mentions: row.mentions,
    highlights: row.highlights,
    sourceRequests: row.sourceRequests,
    reactions: row.reactions,
    follows: row.follows,
    digestHours: row.digestHours,
  }
}

export interface IsWantedParams {
  type: NotificationTypeValue
  preferences: NotificationPreferences
}

export function isWanted({ type, preferences }: IsWantedParams): boolean {
  const key = PREFERENCE_BY_TYPE[type]
  return key === null || preferences[key]
}

export function isGroupable(type: NotificationTypeValue): boolean {
  return GROUPABLE_TYPES.has(type)
}

export function isModeration(type: NotificationTypeValue): boolean {
  return MODERATION_TYPES.includes(type)
}

const MINUTES_PER_DAY = 24 * 60

export interface NextDigestParams {
  now: Date
  hours: readonly number[]
  timeZone: string
}

// The next of the chosen hours in the person's time zone; with no hours chosen, right away.
export function nextDigestAt({ now, hours, timeZone }: NextDigestParams): Date {
  if (hours.length === 0) return now

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(now)

  const hour = Number(parts.find(({ type }) => type === "hour")?.value ?? 0)
  const minute = Number(parts.find(({ type }) => type === "minute")?.value ?? 0)
  const minutesNow = hour * 60 + minute

  const waits = hours.map((target) => {
    const wait = target * 60 - minutesNow
    return wait <= 0 ? wait + MINUTES_PER_DAY : wait
  })

  const startOfMinute = new Date(now)

  startOfMinute.setUTCSeconds(0, 0)

  return new Date(startOfMinute.getTime() + Math.min(...waits) * 60_000)
}

export interface NotificationContextRow {
  notification: Notification
  postTitle: string | null
  postBody: string | null
  postAuthorId: string | null
  postDeletedAt: Date | null
  commentBody: string | null
  actionRule: CommunityRuleValue | null
  actionType: ModerationActionRow["type"] | null
}

export interface ToNotificationViewParams {
  row: NotificationContextRow
  users: Map<string, User>
}

export function toNotificationView({ row, users }: ToNotificationViewParams): NotificationView {
  const { notification } = row

  const actorIds = [notification.actorId, notification.previousActorId].filter(
    (id): id is string => id !== null,
  )

  const postAuthor = row.postAuthorId ? users.get(row.postAuthorId) : undefined
  const isPostActive = notification.postId !== null && row.postDeletedAt === null

  return {
    id: notification.id,
    type: notification.type,
    actors: actorIds.flatMap((id) => {
      const user = users.get(id)
      return user ? [toPublicProfile(user)] : []
    }),
    actorCount: notification.actorCount,
    post: notification.postId
      ? {
          id: notification.postId,
          title: isPostActive ? row.postTitle : null,
          excerpt: isPostActive ? toExcerpt(row.postBody) : null,
          author: isPostActive && postAuthor ? toPublicProfile(postAuthor) : null,
        }
      : null,
    commentId: notification.commentId,
    commentExcerpt: toExcerpt(row.commentBody),
    moderation: isModeration(notification.type)
      ? {
          rule: row.actionRule,
          wasRemoved:
            notification.type === "content_removed" || row.actionType === "report_resolved",
        }
      : null,
    isRead: notification.readAt !== null,
    createdAt: notification.visibleAt.toISOString(),
  }
}
