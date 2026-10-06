import type { Page } from "@ponto/types"
import { z } from "zod"

export const PAGE_SIZE_DEFAULT = 20
export const PAGE_SIZE_MAX = 50

export const cursorSchema = z
  .string()
  .max(256)
  .regex(/^[A-Za-z0-9_-]+$/)

export const paginationQuerySchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
})

export interface PaginationQuery {
  cursor?: string
  limit?: number
}

export function pageSchema<TItem extends z.ZodType>(item: TItem): z.ZodType<Page<z.output<TItem>>> {
  return z.object({
    items: z.array(item),
    nextCursor: cursorSchema.nullable(),
  })
}
