import { MENTIONS_PER_CONTENT_MAX } from "@ponto/config"
import type { ContentSourceValue } from "@ponto/database"
import type { ContentSource } from "@ponto/types"

export interface SourceInput {
  url: string
  title?: string | null
}

export function toSourceValues(inputs: readonly SourceInput[] = []): ContentSourceValue[] {
  return inputs.map(({ url, title }) => ({ url, title: title ?? null }))
}

export function toSourceViews(values: readonly ContentSourceValue[]): ContentSource[] {
  return values.map(({ url, title }) => ({
    url,
    title,
    host: new URL(url).hostname.replace(/^www\./, ""),
  }))
}

const MENTION_PATTERN = /(?<![\w@])@([a-z0-9_]{3,30})\b/gi

// Handles mentioned in a text, lowercased and deduplicated, in order of appearance.
export function extractMentionHandles(text: string): string[] {
  const handles = new Set<string>()

  for (const [, handle] of text.matchAll(MENTION_PATTERN)) {
    if (handle) handles.add(handle.toLowerCase())

    if (handles.size === MENTIONS_PER_CONTENT_MAX) break
  }

  return [...handles]
}

const EXCERPT_LENGTH = 160

export function toExcerpt(text: string | null): string | null {
  if (text === null) return null

  const flattened = text.replace(/\s+/g, " ").trim()

  return flattened.length <= EXCERPT_LENGTH
    ? flattened
    : `${flattened.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…`
}
