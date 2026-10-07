import type { ContentSearchQuery } from "@contraponha/validation"

import type { ContentSearchKey } from "./query-keys.js"

export const SEARCH_TABS = ["all", "posts", "contributions", "people", "topics"] as const

export type SearchTab = (typeof SEARCH_TABS)[number]

export interface ToContentSearchQueryParams {
  key: ContentSearchKey
  cursor: string | undefined
}

export function toContentSearchQuery({
  key,
  cursor,
}: ToContentSearchQueryParams): ContentSearchQuery {
  return {
    q: key.q,
    cursor,
    sort: key.sort,
    period: key.period,
    hasSource: key.hasSource ? "true" : undefined,
    followingOnly: key.followingOnly ? "true" : undefined,
    hasHighlights: key.hasHighlights ? "true" : undefined,
  }
}
