import { Module } from "@nestjs/common"

import { HealthController } from "#src/modules/health/controllers/health.controller.js"
import { HealthService } from "#src/modules/health/services/health.service.js"

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
