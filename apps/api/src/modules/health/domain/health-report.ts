import {
  HealthStatus,
  type DependencyHealth,
  type LivenessReport,
  type ReadinessReport,
} from "@contraponha/types"

export interface BuildLivenessReportParams {
  uptimeSeconds: number
  now: Date
}

export function buildLivenessReport({
  uptimeSeconds,
  now,
}: BuildLivenessReportParams): LivenessReport {
  return {
    status: HealthStatus.UP,
    uptimeSeconds: Math.floor(uptimeSeconds),
    timestamp: now.toISOString(),
  }
}

export interface BuildReadinessReportParams {
  checks: Record<string, DependencyHealth>
  now: Date
}

export function buildReadinessReport({ checks, now }: BuildReadinessReportParams): ReadinessReport {
  const isEverythingUp = Object.values(checks).every((check) => check.status === HealthStatus.UP)

  return {
    status: isEverythingUp ? HealthStatus.UP : HealthStatus.DOWN,
    checks,
    timestamp: now.toISOString(),
  }
}
