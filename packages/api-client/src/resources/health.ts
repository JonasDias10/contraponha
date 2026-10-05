import type { LivenessReport, ReadinessReport } from "@ponto/types"
import { livenessReportSchema, readinessReportSchema } from "@ponto/validation"

import type { HttpClient } from "../http.js"

export interface HealthResource {
  liveness(signal?: AbortSignal): Promise<LivenessReport>
  readiness(signal?: AbortSignal): Promise<ReadinessReport>
  isReady(signal?: AbortSignal): Promise<boolean>
}

export function createHealthResource(request: HttpClient): HealthResource {
  const readiness = (signal?: AbortSignal): Promise<ReadinessReport> =>
    request({ method: "GET", path: "/health/ready", schema: readinessReportSchema, signal })

  return {
    liveness: (signal) =>
      request({ method: "GET", path: "/health/live", schema: livenessReportSchema, signal }),
    readiness,
    isReady: async (signal) => {
      try {
        await readiness(signal)
        return true
      } catch (error) {
        if (signal?.aborted) {
          throw error
        }

        return false
      }
    },
  }
}
