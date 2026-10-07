import type { ModerationActionRow, ReportRow } from "@contraponha/database"
import type { ModerationActionView, ReportView } from "@contraponha/types"

import { toExcerpt } from "#src/common/content/sources.js"
import { toPublicProfile, type User } from "#src/modules/users/domain/user.js"

export type Report = ReportRow
export type ModerationAction = ModerationActionRow

export function reportTargetId(report: Report): string {
  const targetId = report.postId ?? report.commentId ?? report.targetUserId

  if (!targetId) throw new Error(`Report ${report.id} has no target`)

  return targetId
}

// A report as the queue shows it: with the reported text and whose it is.
export interface ReportContextRow {
  report: Report
  postBody: string | null
  postTitle: string | null
  postAuthorId: string | null
  commentBody: string | null
  commentAuthorId: string | null
}

export function reportTargetAuthorId(row: ReportContextRow): string | null {
  return row.report.targetUserId ?? row.commentAuthorId ?? row.postAuthorId
}

export interface ToReportViewParams {
  row: ReportContextRow
  users: Map<string, User>
}

export function toReportView({ row, users }: ToReportViewParams): ReportView {
  const { report } = row
  const reporter = users.get(report.reporterId)
  const targetAuthorId = reportTargetAuthorId(row)
  const targetAuthor = targetAuthorId ? users.get(targetAuthorId) : undefined
  const postText = row.postTitle ?? row.postBody

  return {
    id: report.id,
    targetType: report.targetType,
    targetId: reportTargetId(report),
    reason: report.reason,
    subject: report.subject,
    details: report.details,
    excerpt: toExcerpt(row.commentBody ?? postText),
    targetAuthor: targetAuthor ? toPublicProfile(targetAuthor) : null,
    status: report.status,
    reporter: reporter ? toPublicProfile(reporter) : null,
    createdAt: report.createdAt.toISOString(),
    resolvedAt: report.resolvedAt?.toISOString() ?? null,
  }
}

export interface ToModerationActionViewParams {
  action: ModerationAction
  moderator: User | undefined
}

export function toModerationActionView({
  action,
  moderator,
}: ToModerationActionViewParams): ModerationActionView {
  return {
    id: action.id,
    type: action.type,
    moderator: moderator ? toPublicProfile(moderator) : null,
    reportId: action.reportId,
    postId: action.postId,
    commentId: action.commentId,
    targetUserId: action.targetUserId,
    rule: action.rule,
    note: action.note,
    createdAt: action.createdAt.toISOString(),
  }
}
