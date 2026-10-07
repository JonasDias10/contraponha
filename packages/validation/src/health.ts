import { HealthStatus, type LivenessReport, type ReadinessReport } from "@contraponha/types"
import { z } from "zod"

const healthStatusSchema = z.enum(HealthStatus)

export const livenessReportSchema = z.object({
  status: healthStatusSchema,
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.iso.datetime(),
}) satisfies z.ZodType<LivenessReport>

export const readinessReportSchema = z.object({
  status: healthStatusSchema,
  checks: z.record(
    z.string(),
    z.object({ status: healthStatusSchema, latencyMs: z.number().nonnegative() }),
  ),
  timestamp: z.iso.datetime(),
}) satisfies z.ZodType<ReadinessReport>
