import { Controller, Get } from "@nestjs/common"
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger"
import { SkipThrottle } from "@nestjs/throttler"
import type { LivenessReport, ReadinessReport } from "@ponto/types"
import {
  apiErrorResponseSchema,
  livenessReportSchema,
  readinessReportSchema,
} from "@ponto/validation"

import { toOpenApiSchema } from "../../common/openapi/swagger.js"
import { HealthService } from "./health.service.js"

@ApiTags("health")
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
