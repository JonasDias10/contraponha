import { SEARCH_QUERY_MAX_LENGTH, SEARCH_QUERY_MIN_LENGTH } from "@ponto/config"
import { z } from "zod"

import { paginationQuerySchema } from "./pagination.js"

export const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(SEARCH_QUERY_MIN_LENGTH).max(SEARCH_QUERY_MAX_LENGTH),
})

export interface SearchQuery {
  q: string
  cursor?: string
  limit?: number
}
