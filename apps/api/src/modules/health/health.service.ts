import { Inject, Injectable, Logger } from "@nestjs/common"
import { pingDatabase, type Database } from "@ponto/database"
import { ApiErrorCode, HealthStatus, type LivenessReport, type ReadinessReport } from "@ponto/types"
import type { Redis } from "ioredis"

import { AppError } from "../../common/errors/app-error.js"
import { DATABASE } from "../../infrastructure/database/database.module.js"
import { REDIS } from "../../infrastructure/redis/redis.module.js"
import { probeDependency } from "./dependency-probe.js"
import { buildLivenessReport, buildReadinessReport } from "./health-report.js"

const DEPENDENCY_TIMEOUT_MS = 2_000

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name)

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  getLiveness(): LivenessReport {
    return buildLivenessReport(process.uptime(), new Date())
  }

  async getReadiness(): Promise<ReadinessReport> {
    const [database, redis] = await Promise.all([
      probeDependency(() => pingDatabase(this.db), DEPENDENCY_TIMEOUT_MS),
      probeDependency(() => this.redis.ping(), DEPENDENCY_TIMEOUT_MS),
    ])
    const report = buildReadinessReport({ database, redis }, new Date())

    if (report.status === HealthStatus.DOWN) {
      this.logger.warn({ checks: report.checks }, "Readiness check failed")
      throw new AppError(ApiErrorCode.SERVICE_UNAVAILABLE, { details: report })
    }
    return report
  }
}
