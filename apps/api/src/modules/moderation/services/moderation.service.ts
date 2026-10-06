import { Inject, Injectable } from "@nestjs/common"
import { runTransaction, type Database, type DatabaseTransaction } from "@ponto/database"
import {
  ApiErrorCode,
  ModerationActionType,
  ReportResolution,
  ReportTargetType,
  UserRole,
  type ModerationActionView,
  type Page,
  type ReportStatus,
  type ReportView,
} from "@ponto/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { CommentsService } from "#src/modules/comments/services/comments.service.js"
import {
  toModerationActionView,
  toReportView,
  type Report,
} from "#src/modules/moderation/domain/moderation.js"
import { ModerationActionsRepository } from "#src/modules/moderation/repositories/moderation-actions.repository.js"
import { ReportsRepository } from "#src/modules/moderation/repositories/reports.repository.js"
import { PostsService, type RemovedPost } from "#src/modules/posts/services/posts.service.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const idCursorSchema = z.object({ id: z.uuid() })

export interface ListReportsRequest {
  status: ReportStatus
  cursor?: string
  limit: number
}

export interface ResolveReportParams {
  reportId: string
  moderatorId: string
  resolution: ReportResolution
  note: string | undefined
}

export interface RemoveContentParams {
  targetId: string
  moderatorId: string
  note: string | undefined
}

export interface ChangeRoleParams {
  handle: string
  role: UserRole
  adminId: string
}

export interface ListActionsRequest {
  cursor?: string
  limit: number
}

interface RemoveReportedContentParams {
  report: Report
  tx: DatabaseTransaction
}

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly reportsRepository: ReportsRepository,
    private readonly actionsRepository: ModerationActionsRepository,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
    private readonly usersService: UsersService,
  ) {}

  async listReports({ status, cursor, limit }: ListReportsRequest): Promise<Page<ReportView>> {
    const position = decodeCursor({ cursor, schema: idCursorSchema })

    const rows = await this.reportsRepository.listByStatus({
      status,
      beforeId: position?.id,
      limit: limit + 1,
    })

    const reporters = await this.usersService.findByIds(rows.map(({ reporterId }) => reporterId))

    return buildPage({
      rows,
      limit,
      toItem: (report) => toReportView({ report, reporter: reporters.get(report.reporterId) }),
      toCursor: (report) => ({ id: report.id }),
    })
  }

  async resolveReport({
    reportId,
    moderatorId,
    resolution,
    note,
  }: ResolveReportParams): Promise<void> {
    const report = await this.reportsRepository.findById(reportId)

    if (!report) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

    if (report.status !== "open") throw new AppError(ApiErrorCode.CONFLICT)

    const isRemoval = resolution === ReportResolution.REMOVE_CONTENT

    if (isRemoval && report.targetType === ReportTargetType.USER) {
      throw new AppError(ApiErrorCode.BAD_REQUEST, {
        details: { reason: "Reported accounts cannot be removed through a report resolution" },
      })
    }

    const removed = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const isClosed = await this.reportsRepository.close({
          id: report.id,
          status: isRemoval ? "resolved" : "dismissed",
          resolvedById: moderatorId,
          executor: tx,
        })

        if (!isClosed) throw new AppError(ApiErrorCode.CONFLICT)

        const removedPost = isRemoval ? await this.removeReportedContent({ report, tx }) : undefined

        await this.actionsRepository.record({
          data: {
            moderatorId,
            type: isRemoval
              ? ModerationActionType.REPORT_RESOLVED
              : ModerationActionType.REPORT_DISMISSED,
            reportId: report.id,
            postId: report.postId ?? undefined,
            commentId: report.commentId ?? undefined,
            targetUserId: report.targetUserId ?? undefined,
            note,
          },
          executor: tx,
        })

        return removedPost
      },
    })

    if (removed) await this.postsService.deleteStoredMedia(removed)
  }

  async removePost({ targetId, moderatorId, note }: RemoveContentParams): Promise<void> {
    const removed = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const removedPost = await this.postsService.removeByModeration({
          postId: targetId,
          executor: tx,
        })

        await this.actionsRepository.record({
          data: { moderatorId, type: ModerationActionType.CONTENT_REMOVED, postId: targetId, note },
          executor: tx,
        })

        return removedPost
      },
    })

    await this.postsService.deleteStoredMedia(removed)
  }

  async removeComment({ targetId, moderatorId, note }: RemoveContentParams): Promise<void> {
    await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.commentsService.removeByModeration({ commentId: targetId, executor: tx })

        await this.actionsRepository.record({
          data: {
            moderatorId,
            type: ModerationActionType.CONTENT_REMOVED,
            commentId: targetId,
            note,
          },
          executor: tx,
        })
      },
    })
  }

  async changeRole({ handle, role, adminId }: ChangeRoleParams): Promise<void> {
    const user = await this.usersService.getByHandle(handle)

    if (user.id === adminId && role !== UserRole.ADMIN) {
      throw new AppError(ApiErrorCode.BAD_REQUEST, {
        details: { reason: "Admins cannot demote themselves" },
      })
    }

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.usersService.changeRole({ id: user.id, role, executor: tx })

        await this.actionsRepository.record({
          data: {
            moderatorId: adminId,
            type: ModerationActionType.ROLE_CHANGED,
            targetUserId: user.id,
            note: `${user.role} -> ${role}`,
          },
          executor: tx,
        })
      },
    })
  }

  async listActions({ cursor, limit }: ListActionsRequest): Promise<Page<ModerationActionView>> {
    const position = decodeCursor({ cursor, schema: idCursorSchema })
    const rows = await this.actionsRepository.list({ beforeId: position?.id, limit: limit + 1 })

    const moderators = await this.usersService.findByIds(
      rows.flatMap(({ moderatorId }) => (moderatorId ? [moderatorId] : [])),
    )

    return buildPage({
      rows,
      limit,
      toItem: (action) =>
        toModerationActionView({
          action,
          moderator: action.moderatorId ? moderators.get(action.moderatorId) : undefined,
        }),
      toCursor: (action) => ({ id: action.id }),
    })
  }

  // Content the author already removed counts as handled: the report is still closed.
  private async removeReportedContent({
    report,
    tx,
  }: RemoveReportedContentParams): Promise<RemovedPost | undefined> {
    if (report.postId) {
      const isActive = await this.postsService.isActive(report.postId)

      if (!isActive) return undefined

      return this.postsService.removeByModeration({ postId: report.postId, executor: tx })
    }

    if (report.commentId) {
      const isActive = await this.commentsService.isActive(report.commentId)

      if (isActive)
        await this.commentsService.removeByModeration({ commentId: report.commentId, executor: tx })
    }

    return undefined
  }
}
