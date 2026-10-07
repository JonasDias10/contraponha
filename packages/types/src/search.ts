import type { ContributionView } from "./comments.js"
import type { PostView } from "./posts.js"

export const SearchSort = {
  RELEVANT: "relevant",
  RECENT: "recent",
} as const

export type SearchSort = (typeof SearchSort)[keyof typeof SearchSort]

export const SearchPeriod = {
  ANY: "any",
  DAY: "day",
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
} as const

export type SearchPeriod = (typeof SearchPeriod)[keyof typeof SearchPeriod]

export interface PostSearchResult {
  post: PostView
  highlight: string | null
}

export interface ContributionSearchResult {
  contribution: ContributionView
  highlight: string | null
}
