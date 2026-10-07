import { Injectable } from "@nestjs/common"
import { getUniqueViolationConstraint } from "@contraponha/database"
import {
  ApiErrorCode,
  ReportTargetType,
  type ReportReason,
  type ReportSubject,
  type ReportView,
} from "@contraponha/types"

import { AppError } from "#src/common/errors/app-error.js"
import { CommentsService } from "#src/modules/comments/services/comments.service.js"
import { toReportView } from "#src/modules/moderation/domain/moderation.js"
import {
  OPEN_REPORT_UNIQUE_CONSTRAINTS,
  ReportsRepository,
} from "#src/modules/moderation/repositories/reports.repository.js"
import { PostsService } from "#src/modules/posts/services/posts.service.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

export interface CreateReportParams {
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  subject?: ReportSubject
  details?: string
}

interface ReportTarget {
  postId: string | null
  commentId: string | null
  targetUserId: string | null
}

interface ResolveTargetParams {
  targetType: ReportTargetType
  targetId: string
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly postsService: PostsService,
    private readonly commentsService: CommentsService,
    private readonly usersService: UsersService,
  ) {}

  async create({
    reporterId,
    targetType,
    targetId,
    reason,
    subject,
    details,
  }: CreateReportParams): Promise<ReportView> {
    const target = await this.resolveTarget({ targetType, targetId })

    try {
      const report = await this.reportsRepository.create({
        reporterId,
        targetType,
        ...target,
        reason,
        subject: subject ?? null,
        details: details ?? null,
      })

      const reporter = await this.usersService.getById(reporterId)

      return toReportView({
        row: {
          report,
          postBody: null,
          postTitle: null,
          postAuthorId: null,
          commentBody: null,
          commentAuthorId: null,
        },
        users: new Map([[reporter.id, reporter]]),
      })
    } catch (error) {
      const constraint = getUniqueViolationConstraint(error)

      if (constraint && OPEN_REPORT_UNIQUE_CONSTRAINTS.includes(constraint))
        throw new AppError(ApiErrorCode.DUPLICATE_REPORT, { cause: error })

      throw error
    }
  }

  private async resolveTarget({
    targetType,
    targetId,
  }: ResolveTargetParams): Promise<ReportTarget> {
    if (targetType === ReportTargetType.POST) {
      await this.postsService.getActivePost(targetId)

      return { postId: targetId, commentId: null, targetUserId: null }
    }

    if (targetType === ReportTargetType.COMMENT) {
      await this.commentsService.getActiveComment(targetId)

      return { postId: null, commentId: targetId, targetUserId: null }
    }

    await this.usersService.getById(targetId)

    return { postId: null, commentId: null, targetUserId: targetId }
  }
}
