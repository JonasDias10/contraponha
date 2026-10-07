import type { Locale } from "@contraponha/i18n"

export type DateOrder = "dmy" | "mdy"

interface ParseDateInputParams {
  text: string
  order: DateOrder
}

interface FormatIsoDateParams {
  iso: string
  order: DateOrder
}

export function dateOrderFor(locale: Locale): DateOrder {
  return locale === "en" ? "mdy" : "dmy"
}

export function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8)

  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/")
}

// Returns "" for incomplete or impossible dates, so the form treats them as missing.
export function parseDateInput({ text, order }: ParseDateInputParams): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)

  if (!match) return ""

  const [, first = "", second = "", year = ""] = match
  const [day, month] = order === "dmy" ? [first, second] : [second, first]
  const iso = `${year}-${month}-${day}`
  const date = dateFromIso(iso)

  if (!date || isoFromDate(date) !== iso) return ""

  return iso
}

export function formatIsoDate({ iso, order }: FormatIsoDateParams): string {
  const [year, month, day] = iso.split("-")

  if (!year || !month || !day) return ""

  return order === "dmy" ? `${day}/${month}/${year}` : `${month}/${day}/${year}`
}

export function dateFromIso(iso: string): Date | undefined {
  const [year, month, day] = iso.split("-").map(Number)

  if (!year || !month || !day) return undefined

  return new Date(year, month - 1, day)
}

export function isoFromDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${date.getFullYear()}-${month}-${day}`
}
