import { Inject, Injectable } from "@nestjs/common"
import { comments, posts, reports, type Database, type DatabaseExecutor } from "@ponto/database"
import type { ReportReason, ReportStatus, ReportSubject, ReportTargetType } from "@ponto/types"
import { and, desc, eq, lt, or } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Report, ReportContextRow } from "#src/modules/moderation/domain/moderation.js"

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
  subject: ReportSubject | null
  details: string | null
}

export interface ListReportsParams {
  status: ReportStatus
  beforeId: string | undefined
  limit: number
}

export interface ReportTargetFilter {
  postId: string | null
  commentId: string | null
  targetUserId: string | null
}

export interface ListOpenForTargetParams {
  target: ReportTargetFilter
  executor: DatabaseExecutor
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

  // Joins the reported post or comment (read only) so the queue shows what was reported.
  listByStatus({ status, beforeId, limit }: ListReportsParams): Promise<ReportContextRow[]> {
    return this.db
      .select({
        report: reports,
        postBody: posts.body,
        postTitle: posts.title,
        postAuthorId: posts.authorId,
        commentBody: comments.body,
        commentAuthorId: comments.authorId,
      })
      .from(reports)
      .leftJoin(posts, eq(posts.id, reports.postId))
      .leftJoin(comments, eq(comments.id, reports.commentId))
      .where(and(eq(reports.status, status), beforeId ? lt(reports.id, beforeId) : undefined))
      .orderBy(desc(reports.id))
      .limit(limit)
  }

  listOpenForTarget({ target, executor }: ListOpenForTargetParams): Promise<Report[]> {
    return executor
      .select()
      .from(reports)
      .where(
        and(
          eq(reports.status, "open"),
          or(
            target.postId ? eq(reports.postId, target.postId) : undefined,
            target.commentId ? eq(reports.commentId, target.commentId) : undefined,
            target.targetUserId ? eq(reports.targetUserId, target.targetUserId) : undefined,
          ),
        ),
      )
      .for("update")
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
