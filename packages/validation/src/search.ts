import { SEARCH_QUERY_MAX_LENGTH, SEARCH_QUERY_MIN_LENGTH } from "@contraponha/config"
import {
  SearchPeriod,
  SearchSort,
  type ContributionSearchResult,
  type PostSearchResult,
} from "@contraponha/types"
import { z } from "zod"

import { contributionViewSchema } from "./comments.js"
import { pageSchema, paginationQuerySchema } from "./pagination.js"
import { postViewSchema } from "./posts.js"

const queryFlagSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true")
  .optional()

export const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(SEARCH_QUERY_MIN_LENGTH).max(SEARCH_QUERY_MAX_LENGTH),
})

export const contentSearchQuerySchema = searchQuerySchema.extend({
  sort: z.enum(SearchSort).default(SearchSort.RELEVANT),
  period: z.enum(SearchPeriod).default(SearchPeriod.ANY),
  hasSource: queryFlagSchema,
  followingOnly: queryFlagSchema,
  hasHighlights: queryFlagSchema,
})

export interface SearchQuery {
  q: string
  cursor?: string
  limit?: number
}

export interface ContentSearchQuery extends SearchQuery {
  sort?: SearchSort
  period?: SearchPeriod
  hasSource?: "true" | "false"
  followingOnly?: "true" | "false"
  hasHighlights?: "true" | "false"
}

export const postSearchResultSchema = z.object({
  post: postViewSchema,
  highlight: z.string().nullable(),
}) satisfies z.ZodType<PostSearchResult>

export const postSearchPageSchema = pageSchema(postSearchResultSchema)

export const contributionSearchResultSchema = z.object({
  contribution: contributionViewSchema,
  highlight: z.string().nullable(),
}) satisfies z.ZodType<ContributionSearchResult>

export const contributionSearchPageSchema = pageSchema(contributionSearchResultSchema)
