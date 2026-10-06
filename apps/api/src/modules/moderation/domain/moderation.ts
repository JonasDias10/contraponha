import type { ModerationActionRow, ReportRow } from "@ponto/database"
import type { ModerationActionView, ReportView } from "@ponto/types"

import { toPublicProfile, type User } from "#src/modules/users/domain/user.js"

export type Report = ReportRow
export type ModerationAction = ModerationActionRow

export function reportTargetId(report: Report): string {
  const targetId = report.postId ?? report.commentId ?? report.targetUserId

  if (!targetId) throw new Error(`Report ${report.id} has no target`)

  return targetId
}

export interface ToReportViewParams {
  report: Report
  reporter: User | undefined
}

export function toReportView({ report, reporter }: ToReportViewParams): ReportView {
  return {
    id: report.id,
    targetType: report.targetType,
    targetId: reportTargetId(report),
    reason: report.reason,
    details: report.details,
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
    note: action.note,
    createdAt: action.createdAt.toISOString(),
  }
}
