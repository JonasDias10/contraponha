import {
  HealthStatus,
  type DependencyHealth,
  type LivenessReport,
  type ReadinessReport,
} from "@ponto/types"

export function buildLivenessReport({
  uptimeSeconds,
  now,
}: {
  uptimeSeconds: number
  now: Date
}): LivenessReport {
  return {
    status: HealthStatus.UP,
    uptimeSeconds: Math.floor(uptimeSeconds),
    timestamp: now.toISOString(),
  }
}

export function buildReadinessReport({
  checks,
  now,
}: {
  checks: Record<string, DependencyHealth>
  now: Date
}): ReadinessReport {
  const isEverythingUp = Object.values(checks).every((check) => check.status === HealthStatus.UP)

  return {
    status: isEverythingUp ? HealthStatus.UP : HealthStatus.DOWN,
    checks,
    timestamp: now.toISOString(),
  }
}
