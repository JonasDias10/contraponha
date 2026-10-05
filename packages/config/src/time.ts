const MS_PER_SECOND = 1_000
const MS_PER_MINUTE = 60 * MS_PER_SECOND
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR

export function secondsToMs(seconds: number): number {
  return seconds * MS_PER_SECOND
}

export function minutesToMs(minutes: number): number {
  return minutes * MS_PER_MINUTE
}

export function hoursToMs(hours: number): number {
  return hours * MS_PER_HOUR
}

export function daysToMs(days: number): number {
  return days * MS_PER_DAY
}

export function msToSeconds(ms: number): number {
  return Math.floor(ms / MS_PER_SECOND)
}

export const API_READINESS_TIMEOUT_MS = secondsToMs(3)

export const DATABASE_CONNECTION_TIMEOUT_MS = secondsToMs(5)
export const DATABASE_STATEMENT_TIMEOUT_MS = secondsToMs(15)
