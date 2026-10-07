import { Controller, Get } from "@nestjs/common"
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger"
import { SkipThrottle } from "@nestjs/throttler"
import type { LivenessReport, ReadinessReport } from "@contraponha/types"
import {
  apiErrorResponseSchema,
  livenessReportSchema,
  readinessReportSchema,
} from "@contraponha/validation"

import { Public } from "#src/common/auth/public.decorator.js"
import { toOpenApiSchema } from "#src/common/openapi/swagger.js"
import { HealthService } from "#src/modules/health/services/health.service.js"

@ApiTags("health")
@Public()
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("live")
  @ApiOperation({ summary: "Liveness probe: the process is running" })
  @ApiOkResponse({ schema: toOpenApiSchema(livenessReportSchema) })
  getLiveness(): LivenessReport {
    return this.healthService.getLiveness()
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness probe: PostgreSQL and Redis are reachable" })
  @ApiOkResponse({ schema: toOpenApiSchema(readinessReportSchema) })
  @ApiServiceUnavailableResponse({ schema: toOpenApiSchema(apiErrorResponseSchema) })
  getReadiness(): Promise<ReadinessReport> {
    return this.healthService.getReadiness()
  }
}
