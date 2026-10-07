import { Inject, Injectable } from "@nestjs/common"
import {
  runTransaction,
  type CommunityRuleValue,
  type Database,
  type DatabaseExecutor,
} from "@contraponha/database"
import {
  ApiErrorCode,
  ModerationActionType,
  ReportResolution,
  ReportTargetType,
  UserRole,
  type ContextNoteView,
  type ModerationActionView,
  type Page,
  type ReportStatus,
  type ReportView,
} from "@contraponha/types"
import { z } from "zod"

import { toSourceValues, toSourceViews, type SourceInput } from "#src/common/content/sources.js"
import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import { CommentsService } from "#src/modules/comments/services/comments.service.js"
import {
  reportTargetAuthorId,
  toModerationActionView,
  toReportView,
  type Report,
} from "#src/modules/moderation/domain/moderation.js"
import { ContextNotesRepository } from "#src/modules/moderation/repositories/context-notes.repository.js"
import { ModerationActionsRepository } from "#src/modules/moderation/repositories/moderation-actions.repository.js"
import { ReportsRepository } from "#src/modules/moderation/repositories/reports.repository.js"
import { NotificationsService } from "#src/modules/notifications/services/notifications.service.js"
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
  rule: CommunityRuleValue | undefined
  note: string | undefined
}

export interface RemoveContentParams {
  targetId: string
  moderatorId: string
  rule: CommunityRuleValue
  note: string | undefined
}

export interface SetContextNoteParams {
  postId: string
  moderatorId: string
  body: string
  sources: readonly SourceInput[]
}

export interface RemoveContextNoteParams {
  postId: string
  moderatorId: string
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

interface RemovalOutcome {
  removedPost: RemovedPost | undefined
  contentAuthorId: string | undefined
}

interface RemoveReportedContentParams {
  report: Report
  rule: CommunityRuleValue
  executor: DatabaseExecutor
}

interface CloseTargetReportsParams {
  report: Report
  status: "resolved" | "dismissed"
  moderatorId: string
  actionId: string
  executor: DatabaseExecutor
}

interface NotifyAuthorParams {
  authorId: string | undefined
  actionId: string
  postId?: string
  commentId?: string
  executor: DatabaseExecutor
}

@Injectable()
export class ModerationService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly reportsRepository: ReportsRepository,
    private readonly actionsRepository: ModerationActionsRepository,
    private readonly contextNotesRepository: ContextNotesRepository,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listReports({ status, cursor, limit }: ListReportsRequest): Promise<Page<ReportView>> {
    const position = decodeCursor({ cursor, schema: idCursorSchema })

    const rows = await this.reportsRepository.listByStatus({
      status,
      beforeId: position?.id,
      limit: limit + 1,
    })

    const users = await this.usersService.findByIds(
      rows.flatMap((row) => {
        const targetAuthorId = reportTargetAuthorId(row)
        return targetAuthorId ? [row.report.reporterId, targetAuthorId] : [row.report.reporterId]
      }),
    )

    return buildPage({
      rows,
      limit,
      toItem: (row) => toReportView({ row, users }),
      toCursor: ({ report }) => ({ id: report.id }),
    })
  }

  // Closing the report, removing the content, the audit entry and the notifications to the
  // author and to everyone who reported the same target commit together.
  async resolveReport({
    reportId,
    moderatorId,
    resolution,
    rule,
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

    if (isRemoval && !rule) {
      throw new AppError(ApiErrorCode.VALIDATION_FAILED, {
        details: [{ path: "rule", code: "required" }],
      })
    }

    const removed = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const outcome: RemovalOutcome =
          isRemoval && rule
            ? await this.removeReportedContent({ report, rule, executor: tx })
            : { removedPost: undefined, contentAuthorId: undefined }

        const actionId = await this.actionsRepository.record({
          data: {
            moderatorId,
            type: isRemoval
              ? ModerationActionType.REPORT_RESOLVED
              : ModerationActionType.REPORT_DISMISSED,
            reportId: report.id,
            postId: report.postId ?? undefined,
            commentId: report.commentId ?? undefined,
            targetUserId: report.targetUserId ?? undefined,
            rule,
            note,
          },
          executor: tx,
        })

        await this.closeTargetReports({
          report,
          status: isRemoval ? "resolved" : "dismissed",
          moderatorId,
          actionId,
          executor: tx,
        })

        await this.notifyAuthor({
          authorId: outcome.contentAuthorId,
          actionId,
          postId: report.postId ?? undefined,
          commentId: report.commentId ?? undefined,
          executor: tx,
        })

        return outcome.removedPost
      },
    })

    if (removed) await this.postsService.deleteStoredMedia(removed)
  }

  async removePost({ targetId, moderatorId, rule, note }: RemoveContentParams): Promise<void> {
    const removed = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const removedPost = await this.postsService.removeByModeration({
          postId: targetId,
          rule,
          executor: tx,
        })

        const actionId = await this.actionsRepository.record({
          data: {
            moderatorId,
            type: ModerationActionType.CONTENT_REMOVED,
            postId: targetId,
            rule,
            note,
          },
          executor: tx,
        })

        await this.notifyAuthor({
          authorId: removedPost.authorId,
          actionId,
          postId: targetId,
          executor: tx,
        })

        return removedPost
      },
    })

    await this.postsService.deleteStoredMedia(removed)
  }

  async removeComment({ targetId, moderatorId, rule, note }: RemoveContentParams): Promise<void> {
    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const comment = await this.commentsService.removeByModeration({
          commentId: targetId,
          rule,
          executor: tx,
        })

        const actionId = await this.actionsRepository.record({
          data: {
            moderatorId,
            type: ModerationActionType.CONTENT_REMOVED,
            commentId: targetId,
            rule,
            note,
          },
          executor: tx,
        })

        await this.notifyAuthor({
          authorId: comment.authorId,
          actionId,
          postId: comment.postId,
          commentId: targetId,
          executor: tx,
        })
      },
    })
  }

  async setContextNote({
    postId,
    moderatorId,
    body,
    sources,
  }: SetContextNoteParams): Promise<ContextNoteView> {
    await this.postsService.getActivePost(postId)

    const note = await runTransaction({
      db: this.db,
      work: async (tx) => {
        const created = await this.contextNotesRepository.replace({
          data: { postId, authorId: moderatorId, body, sources: toSourceValues(sources) },
          executor: tx,
        })

        await this.actionsRepository.record({
          data: { moderatorId, type: ModerationActionType.CONTEXT_ADDED, postId, note: body },
          executor: tx,
        })

        return created
      },
    })

    return {
      id: note.id,
      body: note.body,
      sources: toSourceViews(note.sources),
      createdAt: note.createdAt.toISOString(),
    }
  }

  async removeContextNote({ postId, moderatorId }: RemoveContextNoteParams): Promise<void> {
    await runTransaction({
      db: this.db,
      work: async (tx) => {
        const isRetired = await this.contextNotesRepository.retire({ postId, executor: tx })

        if (!isRetired) throw new AppError(ApiErrorCode.RESOURCE_NOT_FOUND)

        await this.actionsRepository.record({
          data: { moderatorId, type: ModerationActionType.CONTEXT_REMOVED, postId },
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
    rule,
    executor,
  }: RemoveReportedContentParams): Promise<RemovalOutcome> {
    if (report.postId) {
      const isActive = await this.postsService.isActive(report.postId)

      if (!isActive) return { removedPost: undefined, contentAuthorId: undefined }

      const removedPost = await this.postsService.removeByModeration({
        postId: report.postId,
        rule,
        executor,
      })

      return { removedPost, contentAuthorId: removedPost.authorId }
    }

    if (report.commentId) {
      const isActive = await this.commentsService.isActive(report.commentId)

      if (!isActive) return { removedPost: undefined, contentAuthorId: undefined }

      const comment = await this.commentsService.removeByModeration({
        commentId: report.commentId,
        rule,
        executor,
      })

      return { removedPost: undefined, contentAuthorId: comment.authorId }
    }

    return { removedPost: undefined, contentAuthorId: undefined }
  }

  // Every open report on the same target gets the same decision, and each reporter hears back.
  private async closeTargetReports({
    report,
    status,
    moderatorId,
    actionId,
    executor,
  }: CloseTargetReportsParams): Promise<void> {
    const open = await this.reportsRepository.listOpenForTarget({ target: report, executor })

    for (const target of open) {
      await this.reportsRepository.close({
        id: target.id,
        status,
        resolvedById: moderatorId,
        executor,
      })

      await this.notificationsService.notify({
        recipientId: target.reporterId,
        actorId: null,
        type: "report_resolved",
        postId: target.postId ?? undefined,
        commentId: target.commentId ?? undefined,
        moderationActionId: actionId,
        executor,
      })
    }
  }

  private async notifyAuthor({
    authorId,
    actionId,
    postId,
    commentId,
    executor,
  }: NotifyAuthorParams): Promise<void> {
    if (!authorId) return

    await this.notificationsService.notify({
      recipientId: authorId,
      actorId: null,
      type: "content_removed",
      postId,
      commentId,
      moderationActionId: actionId,
      executor,
    })
  }
}
