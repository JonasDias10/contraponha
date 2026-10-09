import { Inject, Injectable } from "@nestjs/common"
import { comments, posts, reports, sessions, users, type Database } from "@contraponha/database"
import { count, countDistinct, eq, gte, isNull, sql } from "drizzle-orm"
import type { PgColumn, PgTable } from "drizzle-orm/pg-core"

import { DATABASE } from "#src/infrastructure/database/database.module.js"

export interface DayCount {
  day: string
  total: number
}

export interface MetricTotals {
  users: number
  activeUsers7d: number
  posts: number
  comments: number
  openReports: number
}

export interface DailySeries {
  signups: DayCount[]
  posts: DayCount[]
  comments: DayCount[]
  reports: DayCount[]
}

interface CountByDayParams {
  table: PgTable
  column: PgColumn
  since: Date
}

const ACTIVE_WINDOW = sql`now() - interval '7 days'`

// Read-only reporting queries across modules for the admin dashboard. Days are UTC.
@Injectable()
export class AdminMetricsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async totals(): Promise<MetricTotals> {
    const [userTotal] = await this.db
      .select({ total: count() })
      .from(users)
      .where(isNull(users.deletedAt))

    const [active] = await this.db
      .select({ total: countDistinct(sessions.userId) })
      .from(sessions)
      .where(gte(sessions.lastUsedAt, ACTIVE_WINDOW))

    const [postTotal] = await this.db
      .select({ total: count() })
      .from(posts)
      .where(isNull(posts.deletedAt))

    const [commentTotal] = await this.db
      .select({ total: count() })
      .from(comments)
      .where(isNull(comments.deletedAt))

    const [openReports] = await this.db
      .select({ total: count() })
      .from(reports)
      .where(eq(reports.status, "open"))

    return {
      users: userTotal?.total ?? 0,
      activeUsers7d: active?.total ?? 0,
      posts: postTotal?.total ?? 0,
      comments: commentTotal?.total ?? 0,
      openReports: openReports?.total ?? 0,
    }
  }

  async daily(since: Date): Promise<DailySeries> {
    const [signups, postCounts, commentCounts, reportCounts] = await Promise.all([
      this.countByDay({ table: users, column: users.createdAt, since }),
      this.countByDay({ table: posts, column: posts.createdAt, since }),
      this.countByDay({ table: comments, column: comments.createdAt, since }),
      this.countByDay({ table: reports, column: reports.createdAt, since }),
    ])

    return { signups, posts: postCounts, comments: commentCounts, reports: reportCounts }
  }

  private countByDay({ table, column, since }: CountByDayParams): Promise<DayCount[]> {
    const day = sql<string>`to_char(${column} at time zone 'UTC', 'YYYY-MM-DD')`

    return this.db
      .select({ day, total: count() })
      .from(table)
      .where(gte(column, since))
      .groupBy(day)
  }
}
