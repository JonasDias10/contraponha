import type { Locale } from "@contraponha/i18n"
import type { NotificationPreferences } from "@contraponha/types"

export type PreferenceSwitch = Exclude<keyof NotificationPreferences, "digestHours">

export interface PreferenceSwitchOption {
  key: PreferenceSwitch
  label:
    | "prefReplies"
    | "prefMentions"
    | "prefHighlights"
    | "prefSourceRequests"
    | "prefReactions"
    | "prefFollows"
}

export const NOTIFICATION_SWITCHES: PreferenceSwitchOption[] = [
  { key: "replies", label: "prefReplies" },
  { key: "mentions", label: "prefMentions" },
  { key: "highlights", label: "prefHighlights" },
  { key: "sourceRequests", label: "prefSourceRequests" },
  { key: "reactions", label: "prefReactions" },
  { key: "follows", label: "prefFollows" },
]

export const DIGEST_HOURS = [7, 9, 12, 15, 19, 21] as const

export const DIGEST_HOURS_MAX = 4

export interface ToggleDigestHourParams {
  hours: number[]
  hour: number
}

export function toggleDigestHour({ hours, hour }: ToggleDigestHourParams): number[] {
  return hours.includes(hour)
    ? hours.filter((value) => value !== hour)
    : [...hours, hour].toSorted((a, b) => a - b).slice(0, DIGEST_HOURS_MAX)
}

export function formatDigestHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}h`
}

export const LOCALE_NAMES: Record<Locale, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
  es: "Español",
}
