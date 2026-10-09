import { Controller, Get, Query, UseGuards } from "@nestjs/common"
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger"
import { UserRole, type AdminMetrics } from "@contraponha/types"
import { adminMetricsQuerySchema, adminMetricsSchema } from "@contraponha/validation"
import type { z } from "zod"

import { RequireRole } from "#src/common/auth/require-role.decorator.js"
import {
  ApiStandardErrors,
  SESSION_SECURITY_SCHEME,
  toOpenApiSchema,
} from "#src/common/openapi/swagger.js"
import { ZodValidationPipe } from "#src/common/validation/zod-validation.pipe.js"
import { AdminMetricsService } from "#src/modules/admin/services/admin-metrics.service.js"
import { RoleGuard } from "#src/modules/users/guards/role.guard.js"

@ApiTags("admin")
@ApiStandardErrors()
@ApiBearerAuth(SESSION_SECURITY_SCHEME)
@UseGuards(RoleGuard)
@RequireRole(UserRole.MODERATOR)
@Controller("admin/metrics")
export class AdminMetricsController {
  constructor(private readonly metrics: AdminMetricsService) {}

  @Get()
  @ApiOperation({ summary: "Totals and daily counts (UTC) for the dashboard" })
  @ApiOkResponse({ schema: toOpenApiSchema(adminMetricsSchema) })
  overview(
    @Query(new ZodValidationPipe(adminMetricsQuerySchema))
    query: z.output<typeof adminMetricsQuerySchema>,
  ): Promise<AdminMetrics> {
    return this.metrics.overview(query.days)
  }
}
