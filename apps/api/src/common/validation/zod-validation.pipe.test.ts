import { ApiErrorCode } from "@ponto/types"
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { ZodValidationPipe } from "./zod-validation.pipe.js"

const pipe = new ZodValidationPipe(z.object({ title: z.string().trim().min(1) }))

describe("ZodValidationPipe", () => {
  it("returns the parsed value, dropping unknown keys", () => {
    expect(pipe.transform({ title: "  Olá  ", role: "admin" })).toEqual({ title: "Olá" })
  })

  it("throws a VALIDATION_FAILED AppError with field-level details", () => {
    let caught: unknown
    try {
      pipe.transform({ title: "   " })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(AppError)

    expect(caught).toMatchObject({
      code: ApiErrorCode.VALIDATION_FAILED,
      status: 400,
      details: [{ path: "title", code: "too_small" }],
    })
  })
})
