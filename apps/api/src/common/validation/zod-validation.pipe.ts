import { Injectable, type PipeTransform } from "@nestjs/common"
import { ApiErrorCode } from "@contraponha/types"
import { toValidationIssues } from "@contraponha/validation"
import type { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"

@Injectable()
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform<
  unknown,
  z.output<TSchema>
> {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value)

    if (!result.success) {
      throw new AppError(ApiErrorCode.VALIDATION_FAILED, {
        details: toValidationIssues(result.error),
      })
    }

    return result.data
  }
}
