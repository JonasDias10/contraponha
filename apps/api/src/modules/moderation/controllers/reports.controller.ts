import { Body, Controller, Post } from "@nestjs/common"
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import type { ReportView } from "@ponto/types"
import { createReportInputSchema, reportViewSchema } from "@ponto/validation"
import type { z } from "zod"

import { CurrentAuth, type AuthContext } from "#src/common/auth/auth-context.js"
import {
  ApiStandardErrors,
  ApiZodBody,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { SensitiveRateLimit } from "#src/common/rate-limit/rate-limit.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { ReportsService } from "#src/modules/moderation/services/reports.service.js"

@ApiTags("moderation")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @SensitiveRateLimit()
  @Post()
  @ApiOperation({ summary: "Report a post, comment or account to the moderators" })
  @ApiZodBody(createReportInputSchema)
  @ApiCreatedResponse({ schema: toOpenApiSchema(reportViewSchema) })
  create(
    @CurrentAuth() auth: AuthContext,
    @Body(new ZodValidationPipe(createReportInputSchema))
    body: z.output<typeof createReportInputSchema>,
  ): Promise<ReportView> {
    return this.reportsService.create({ reporterId: auth.userId, ...body })
  }
}
