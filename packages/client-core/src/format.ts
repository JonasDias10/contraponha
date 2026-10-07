import type { Locale } from "@contraponha/i18n"

const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

export interface FormatDateParams {
  value: string
  locale: Locale
  now?: Date
}

// "há 40 min", "há 3 h", "ontem"; older dates show day and month, and the year when it differs.
export function formatRelativeDate({ value, locale, now = new Date() }: FormatDateParams): string {
  const date = new Date(value)
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000)
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" })

  if (seconds < MINUTE) return relative.format(0, "second")

  if (seconds < HOUR) return relative.format(-Math.floor(seconds / MINUTE), "minute")

  if (seconds < DAY) return relative.format(-Math.floor(seconds / HOUR), "hour")

  if (seconds < WEEK) return relative.format(-Math.floor(seconds / DAY), "day")

  return formatDate({ value, locale, now })
}

export function formatDate({ value, locale, now = new Date() }: FormatDateParams): string {
  const date = new Date(value)
  const isSameYear = date.getFullYear() === now.getFullYear()

  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(isSameYear ? {} : { year: "numeric" }),
  }).format(date)
}

export function formatDateTime({ value, locale }: FormatDateParams): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  )
}

export function formatMonthYear({ value, locale }: FormatDateParams): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(value))
}

export interface FormatCountParams {
  value: number
  locale: Locale
}

// Small and equal counts by design: "2,4 mil" rather than "2.400".
export function formatCount({ value, locale }: FormatCountParams): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  )
}

const WORDS_PER_MINUTE = 220

export function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}
