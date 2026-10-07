import { Inject, Injectable, Logger } from "@nestjs/common"
import { pingDatabase, type Database } from "@contraponha/database"
import {
  ApiErrorCode,
  HealthStatus,
  type LivenessReport,
  type ReadinessReport,
} from "@contraponha/types"
import type { Redis } from "ioredis"

import { AppError } from "#src/common/errors/app-error.js"
import { HEALTH_DEPENDENCY_TIMEOUT_MS } from "#src/config/durations.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { REDIS } from "#src/infrastructure/redis/redis.module.js"
import { probeDependency } from "#src/modules/health/infrastructure/dependency-probe.js"
import {
  buildLivenessReport,
  buildReadinessReport,
} from "#src/modules/health/domain/health-report.js"

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name)

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  getLiveness(): LivenessReport {
    return buildLivenessReport({ uptimeSeconds: process.uptime(), now: new Date() })
  }

  async getReadiness(): Promise<ReadinessReport> {
    const [database, redis] = await Promise.all([
      probeDependency({
        check: () => pingDatabase(this.db),
        timeoutMs: HEALTH_DEPENDENCY_TIMEOUT_MS,
      }),
      probeDependency({
        check: () => this.redis.ping(),
        timeoutMs: HEALTH_DEPENDENCY_TIMEOUT_MS,
      }),
    ])

    const report = buildReadinessReport({ checks: { database, redis }, now: new Date() })

    if (report.status === HealthStatus.DOWN) {
      this.logger.warn({ checks: report.checks }, "Readiness check failed")

      throw new AppError(ApiErrorCode.SERVICE_UNAVAILABLE, { details: report })
    }

    return report
  }
}
