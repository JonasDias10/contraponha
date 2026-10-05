export const HealthStatus = {
  UP: "up",
  DOWN: "down",
} as const

export type HealthStatus = (typeof HealthStatus)[keyof typeof HealthStatus]

export interface DependencyHealth {
  status: HealthStatus
  latencyMs: number
}

export interface LivenessReport {
  status: HealthStatus
  uptimeSeconds: number
  timestamp: string
}

export interface ReadinessReport {
  status: HealthStatus
  checks: Record<string, DependencyHealth>
  timestamp: string
}
