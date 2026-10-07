"use client"

import { SEARCH_QUERY_MIN_LENGTH } from "@ponto/config"
import { SearchPeriod, SearchSort } from "@ponto/types"
import type { Route } from "next"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import type { ContentSearchKey } from "@/lib/query-keys"

export const SEARCH_TABS = ["all", "posts", "contributions", "people", "topics"] as const

export type SearchTab = (typeof SEARCH_TABS)[number]

export interface SearchState extends ContentSearchKey {
  tab: SearchTab
  isSearchable: boolean
}

export type SearchChanges = Partial<Record<keyof SearchState, string | boolean | undefined>>

export interface SearchStateApi {
  state: SearchState
  update: (changes: SearchChanges) => void
}

interface PickParams<TValue extends string> {
  options: readonly TValue[]
  value: string | null
  fallback: TValue
}

function pick<TValue extends string>({ options, value, fallback }: PickParams<TValue>): TValue {
  return options.find((option) => option === value) ?? fallback
}

// The URL is the source of truth, so searches can be shared and the back button works.
export function useSearchState(): SearchStateApi {
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const q = (params.get("q") ?? "").trim()

  const state: SearchState = {
    q,
    tab: pick({ options: SEARCH_TABS, value: params.get("type"), fallback: "all" }),
    sort: pick({
      options: Object.values(SearchSort),
      value: params.get("sort"),
      fallback: SearchSort.RELEVANT,
    }),
    period: pick({
      options: Object.values(SearchPeriod),
      value: params.get("period"),
      fallback: SearchPeriod.ANY,
    }),
    hasSource: params.get("hasSource") === "true",
    followingOnly: params.get("followingOnly") === "true",
    hasHighlights: params.get("hasHighlights") === "true",
    isSearchable: q.length >= SEARCH_QUERY_MIN_LENGTH,
  }

  const update = (changes: SearchChanges): void => {
    const next = new URLSearchParams(params)

    for (const [key, value] of Object.entries(changes)) {
      const name = key === "tab" ? "type" : key

      if (value === undefined || value === false || value === "") next.delete(name)
      else next.set(name, String(value))
    }

    router.replace(`${pathname}?${next.toString()}` as Route, { scroll: false })
  }

  return { state, update }
}
