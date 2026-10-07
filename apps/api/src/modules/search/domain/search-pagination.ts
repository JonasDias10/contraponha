import { HIGHLIGHT_END, HIGHLIGHT_START, SearchPeriod } from "@contraponha/types"

// Relevance order is not stable enough for keyset pagination, so search pages by offset
// and stops after a cap; deeper results call for a more specific query.
export const SEARCH_MAX_OFFSET = 200

export const TOPIC_RESULTS_LIMIT = 5

// LIKE treats % and _ as wildcards; the user's text must match literally.
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`)
}

const PERIOD_DAYS: Record<SearchPeriod, number | null> = {
  [SearchPeriod.ANY]: null,
  [SearchPeriod.DAY]: 1,
  [SearchPeriod.WEEK]: 7,
  [SearchPeriod.MONTH]: 30,
  [SearchPeriod.YEAR]: 365,
}

export interface PeriodStartParams {
  period: SearchPeriod
  now: Date
}

export function periodStart({ period, now }: PeriodStartParams): Date | null {
  const days = PERIOD_DAYS[period]
  return days === null ? null : new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

// ts_headline options: matches are wrapped in control characters, never in HTML.
export const HEADLINE_OPTIONS = `StartSel=${HIGHLIGHT_START}, StopSel=${HIGHLIGHT_END}, MaxWords=35, MinWords=12, ShortWord=2, MaxFragments=1, FragmentDelimiter=" … "`
