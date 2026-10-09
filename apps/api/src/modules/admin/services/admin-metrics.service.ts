import { Injectable } from "@nestjs/common"
import type { AdminMetrics, DailyMetric } from "@contraponha/types"

import {
  AdminMetricsRepository,
  type DayCount,
} from "#src/modules/admin/repositories/admin-metrics.repository.js"
import { SuspensionsRepository } from "#src/modules/users/repositories/suspensions.repository.js"

const DAY_MS = 24 * 60 * 60 * 1000

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function totalsByDay(counts: readonly DayCount[]): Map<string, number> {
  return new Map(counts.map(({ day, total }) => [day, total]))
}

export interface UtcDaysParams {
  since: Date
  days: number
}

// Every day in the window appears, with zeros where nothing happened.
export function utcDays({ since, days }: UtcDaysParams): string[] {
  return Array.from({ length: days }, (_, index) =>
    new Date(since.getTime() + index * DAY_MS).toISOString().slice(0, 10),
  )
}

@Injectable()
export class AdminMetricsService {
  constructor(
    private readonly metrics: AdminMetricsRepository,
    private readonly suspensions: SuspensionsRepository,
  ) {}

  async overview(days: number): Promise<AdminMetrics> {
    const since = new Date(startOfUtcDay(new Date()).getTime() - (days - 1) * DAY_MS)

    const [totals, activeSuspensions, series] = await Promise.all([
      this.metrics.totals(),
      this.suspensions.countActive(),
      this.metrics.daily(since),
    ])

    const signups = totalsByDay(series.signups)
    const posts = totalsByDay(series.posts)
    const comments = totalsByDay(series.comments)
    const reports = totalsByDay(series.reports)

    const daily: DailyMetric[] = utcDays({ since, days }).map((date) => ({
      date,
      signups: signups.get(date) ?? 0,
      posts: posts.get(date) ?? 0,
      comments: comments.get(date) ?? 0,
      reports: reports.get(date) ?? 0,
    }))

    return { totals: { ...totals, activeSuspensions }, daily }
  }
}
