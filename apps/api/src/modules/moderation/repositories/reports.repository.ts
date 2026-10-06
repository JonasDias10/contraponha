import { Inject, Injectable } from "@nestjs/common"
import { reports, type Database, type DatabaseExecutor } from "@ponto/database"
import type { ReportReason, ReportStatus, ReportTargetType } from "@ponto/types"
import { and, desc, eq, lt } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Report } from "#src/modules/moderation/domain/moderation.js"

export const OPEN_REPORT_UNIQUE_CONSTRAINTS = [
  "reports_open_post_unique",
  "reports_open_comment_unique",
  "reports_open_user_unique",
]

export interface CreateReportData {
  reporterId: string
  targetType: ReportTargetType
  postId: string | null
  commentId: string | null
  targetUserId: string | null
  reason: ReportReason
  details: string | null
}

export interface ListReportsParams {
  status: ReportStatus
  beforeId: string | undefined
  limit: number
}

export interface CloseReportParams {
  id: string
  status: Exclude<ReportStatus, "open">
  resolvedById: string
  executor?: DatabaseExecutor
}

@Injectable()
export class ReportsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(data: CreateReportData): Promise<Report> {
    const [report] = await this.db.insert(reports).values(data).returning()

    if (!report) throw new Error("Insert into reports returned no row")

    return report
  }

  async findById(id: string): Promise<Report | undefined> {
    const [report] = await this.db.select().from(reports).where(eq(reports.id, id))
    return report
  }

  listByStatus({ status, beforeId, limit }: ListReportsParams): Promise<Report[]> {
    return this.db
      .select()
      .from(reports)
      .where(and(eq(reports.status, status), beforeId ? lt(reports.id, beforeId) : undefined))
      .orderBy(desc(reports.id))
      .limit(limit)
  }

  async close({
    id,
    status,
    resolvedById,
    executor = this.db,
  }: CloseReportParams): Promise<boolean> {
    const closed = await executor
      .update(reports)
      .set({ status, resolvedById, resolvedAt: new Date() })
      .where(and(eq(reports.id, id), eq(reports.status, "open")))
      .returning({ id: reports.id })

    return closed.length > 0
  }
}
