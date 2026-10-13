import type { ContentSourceValue } from "@contraponha/database"

const URL_PATTERN = /https?:\/\/[^\s<>()"'\]]+/i
const TRAILING_PUNCTUATION = /[.,;:!?]+$/

export interface PreviewUrlParams {
  body: string | null
  sources: readonly ContentSourceValue[]
}

// The link a post previews: its first cited source, or else the first link in the text.
export function previewUrlOf({ body, sources }: PreviewUrlParams): string | null {
  const [firstSource] = sources

  if (firstSource) return firstSource.url

  const match = body?.match(URL_PATTERN)?.[0]

  return match ? match.replace(TRAILING_PUNCTUATION, "") : null
}
