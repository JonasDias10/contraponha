import { Body, Controller, Get, Post } from "@nestjs/common"
import { z } from "zod"

import { ZodValidationPipe } from "../../src/common/validation/zod-validation.pipe.js"

const createProbeSchema = z.object({
  title: z.string().trim().min(1).max(280),
})

@Controller("probe")
export class ProbeController {
  @Post()
  create(
    @Body(new ZodValidationPipe(createProbeSchema)) body: z.output<typeof createProbeSchema>,
  ): z.output<typeof createProbeSchema> {
    return body
  }

  @Get("failure")
  fail(): never {
    throw new Error("connection string postgres://secret@db leaked")
  }

  @Get("limited")
  limited(): { ok: true } {
    return { ok: true }
  }
}
