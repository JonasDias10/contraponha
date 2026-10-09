"use client"

import { formatDateTime, formatRelativeDate } from "@contraponha/client-core"

import { useI18n } from "./i18n-provider.js"
import { useIsClient } from "./use-is-client.js"

export interface RelativeTimeProps {
  value: string
}

// Relative time depends on the reader's clock, so the server renders the absolute date
// and the browser switches to "há 3 h" after hydration.
export function RelativeTime({ value }: RelativeTimeProps): React.JSX.Element {
  const { locale } = useI18n()
  const isClient = useIsClient()
  const absolute = formatDateTime({ value, locale })

  return (
    <time dateTime={value} title={absolute}>
      {isClient ? formatRelativeDate({ value, locale }) : absolute}
    </time>
  )
}
