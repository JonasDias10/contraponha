import { Param } from "@nestjs/common"
import { z } from "zod"

import { ZodValidationPipe } from "./zod-validation.pipe.js"

const uuidSchema = z.uuid()

export function UuidParam(name: string): ParameterDecorator {
  return Param(name, new ZodValidationPipe(uuidSchema))
}
