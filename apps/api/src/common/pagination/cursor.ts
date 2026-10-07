import { ApiErrorCode, type Page } from "@contraponha/types"
import type { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"

export function encodeCursor(value: Record<string, string>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url")
}

export interface DecodeCursorParams<TSchema extends z.ZodType> {
  cursor: string | undefined
  schema: TSchema
}

export function decodeCursor<TSchema extends z.ZodType>({
  cursor,
  schema,
}: DecodeCursorParams<TSchema>): z.output<TSchema> | undefined {
  if (!cursor) return undefined

  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    return schema.parse(decoded)
  } catch {
    throw new AppError(ApiErrorCode.VALIDATION_FAILED, {
      details: [{ path: "cursor", code: "invalid_cursor" }],
    })
  }
}

export interface BuildPageParams<TRow, TItem> {
  rows: TRow[]
  limit: number
  toItem: (row: TRow) => TItem
  toCursor: (row: TRow) => Record<string, string>
}

// Repositories fetch limit + 1 rows; the extra row only signals that another page exists.
export function buildPage<TRow, TItem>({
  rows,
  limit,
  toItem,
  toCursor,
}: BuildPageParams<TRow, TItem>): Page<TItem> {
  const pageRows = rows.slice(0, limit)
  const lastRow = pageRows.at(-1)
  const hasMore = rows.length > limit

  return {
    items: pageRows.map(toItem),
    nextCursor: hasMore && lastRow ? encodeCursor(toCursor(lastRow)) : null,
  }
}
