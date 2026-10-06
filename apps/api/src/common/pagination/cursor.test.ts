import { describe, expect, it } from "vitest"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"

import { buildPage, decodeCursor, encodeCursor } from "./cursor.js"

interface Row {
  id: string
}

const idCursorSchema = z.object({ id: z.uuid() })
const id = "01a10c6c-3803-7cf0-9b8e-03a8eac97154"

describe("cursor pagination", () => {
  it("round-trips a cursor through its opaque form", () => {
    const cursor = encodeCursor({ id })

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+$/)

    expect(decodeCursor({ cursor, schema: idCursorSchema })).toEqual({ id })
  })

  it("rejects tampered cursors with a validation error", () => {
    const tampered = encodeCursor({ id: "not-a-uuid" })

    expect(() => decodeCursor({ cursor: tampered, schema: idCursorSchema })).toThrow(AppError)

    expect(() => decodeCursor({ cursor: "%%%", schema: idCursorSchema })).toThrow(AppError)
  })

  it("only returns a next cursor when an extra row was fetched", () => {
    const rows = [{ id: "a" }, { id: "b" }, { id: "c" }]

    const params = {
      limit: 2,
      toItem: (row: Row) => row.id,
      toCursor: (row: Row) => ({ id: row.id }),
    }

    const firstPage = buildPage({ rows, ...params })
    const lastPage = buildPage({ rows: rows.slice(0, 2), ...params })

    expect(firstPage.items).toEqual(["a", "b"])

    expect(
      decodeCursor({
        cursor: firstPage.nextCursor ?? undefined,
        schema: z.object({ id: z.string() }),
      }),
    ).toEqual({ id: "b" })

    expect(lastPage.nextCursor).toBeNull()
  })
})
