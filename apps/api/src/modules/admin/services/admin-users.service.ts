import { Inject, Injectable } from "@nestjs/common"
import { canActOn } from "@contraponha/client-core"
import { runTransaction, type CommunityRuleValue, type Database } from "@contraponha/database"
import {
  ApiErrorCode,
  ModerationActionType,
  type AdminUserDetail,
  type AdminUserSummary,
  type Page,
} from "@contraponha/types"
import { z } from "zod"

import { AppError } from "#src/common/errors/app-error.js"
import { buildPage, decodeCursor } from "#src/common/pagination/cursor.js"
import { DATABASE } from "#src/infrastructure/database/database.module.js"
import {
  AdminUsersRepository,
  type AdminStatusFilter,
  type AdminUserRow,
} from "#src/modules/admin/repositories/admin-users.repository.js"
import { SessionsService } from "#src/modules/auth/services/sessions.service.js"
import { ModerationActionsRepository } from "#src/modules/moderation/repositories/moderation-actions.repository.js"
import { PushService } from "#src/modules/push/services/push.service.js"
import {
  accountStatusOf,
  isSuspensionActive,
  toSuspensionView,
  type Suspension,
} from "#src/modules/users/domain/suspension.js"
import { toPrivateProfile, type User } from "#src/modules/users/domain/user.js"
import { SuspensionsRepository } from "#src/modules/users/repositories/suspensions.repository.js"
import { ProfilePhotoService } from "#src/modules/users/services/profile-photo.service.js"
import { UsersService } from "#src/modules/users/services/users.service.js"

const userCursorSchema = z.object({ id: z.uuid() })

export interface ListAdminUsersRequest {
  q?: string
  role?: User["role"]
  status?: AdminStatusFilter
  cursor?: string
  limit: number
}

export interface SuspendUserRequest {
  handle: string
  actorId: string
  rule: CommunityRuleValue
  note?: string
  endsAt?: string | null
}

export interface ActOnUserRequest {
  handle: string
  actorId: string
}

interface ToSummaryParams {
  row: AdminUserRow
  moderators: Map<string, User>
}

interface EnsureCanActParams {
  target: User
  actorId: string
}

@Injectable()
export class AdminUsersService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly adminUsers: AdminUsersRepository,
    private readonly usersService: UsersService,
    private readonly suspensions: SuspensionsRepository,
    private readonly sessionsService: SessionsService,
    private readonly actions: ModerationActionsRepository,
    private readonly profilePhoto: ProfilePhotoService,
    private readonly pushService: PushService,
  ) {}

  async list({
    cursor,
    limit,
    ...filters
  }: ListAdminUsersRequest): Promise<Page<AdminUserSummary>> {
    const position = decodeCursor({ cursor, schema: userCursorSchema })

    const rows = await this.adminUsers.list({
      q: filters.q,
      role: filters.role,
      status: filters.status,
      beforeId: position?.id,
      limit: limit + 1,
    })

    const moderators = await this.usersService.findByIds(
      rows.flatMap(({ suspension }) => (suspension?.moderatorId ? [suspension.moderatorId] : [])),
    )

    return buildPage({
      rows,
      limit,
      toItem: (row) => this.toSummary({ row, moderators }),
      toCursor: ({ user }) => ({ id: user.id }),
    })
  }

  async detail(handle: string): Promise<AdminUserDetail> {
    const user = await this.usersService.getByHandle(handle)

    const [history, activity] = await Promise.all([
      this.suspensions.listForUser(user.id),
      this.adminUsers.activity(user.id),
    ])

    const moderators = await this.usersService.findByIds(
      history.flatMap(({ moderatorId }) => (moderatorId ? [moderatorId] : [])),
    )

    const open = history.find(({ liftedAt }) => liftedAt === null) ?? null

    return {
      ...this.toSummary({ row: { user, suspension: open }, moderators }),
      suspensions: history.map((suspension) =>
        toSuspensionView({
          suspension,
          moderator: suspension.moderatorId ? moderators.get(suspension.moderatorId) : undefined,
        }),
      ),
      reportsAgainst: activity.reportsAgainst,
      reportsFiled: activity.reportsFiled,
      lastActiveAt: activity.lastActiveAt?.toISOString() ?? null,
    }
  }

  // Replaces any running suspension, ends every session and forgets the person's devices,
  // all in one transaction with the audit entry.
  async suspend({
    handle,
    actorId,
    rule,
    note,
    endsAt,
  }: SuspendUserRequest): Promise<AdminUserDetail> {
    const target = await this.usersService.getByHandle(handle)

    await this.ensureCanAct({ target, actorId })

    const revoked = await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.suspensions.closeOpen({ userId: target.id, liftedById: actorId, executor: tx })

        await this.suspensions.create({
          data: {
            userId: target.id,
            moderatorId: actorId,
            rule,
            note: note ?? null,
            endsAt: endsAt ? new Date(endsAt) : null,
          },
          executor: tx,
        })

        await this.actions.record({
          data: {
            moderatorId: actorId,
            type: ModerationActionType.USER_SUSPENDED,
            targetUserId: target.id,
            rule,
            note: [endsAt ? `until ${endsAt}` : "permanent", note].filter(Boolean).join(": "),
          },
          executor: tx,
        })

        return this.sessionsService.revokeAll({ userId: target.id, executor: tx })
      },
    })

    await this.sessionsService.evictFromCache(revoked)

    await this.pushService.forgetDevices(target.id)

    return this.detail(handle)
  }

  async lift({ handle, actorId }: ActOnUserRequest): Promise<AdminUserDetail> {
    const target = await this.usersService.getByHandle(handle)

    await this.ensureCanAct({ target, actorId })

    const open = await this.suspensions.findOpen(target.id)

    if (!open || !isSuspensionActive({ suspension: open }))
      throw new AppError(ApiErrorCode.CONFLICT, { details: { reason: "Not suspended" } })

    await runTransaction({
      db: this.db,
      work: async (tx) => {
        await this.suspensions.closeOpen({ userId: target.id, liftedById: actorId, executor: tx })

        await this.actions.record({
          data: {
            moderatorId: actorId,
            type: ModerationActionType.SUSPENSION_LIFTED,
            targetUserId: target.id,
          },
          executor: tx,
        })
      },
    })

    return this.detail(handle)
  }

  async removeAvatar({ handle, actorId }: ActOnUserRequest): Promise<AdminUserDetail> {
    const target = await this.usersService.getByHandle(handle)

    await this.ensureCanAct({ target, actorId })

    if (!target.avatarUrl) return this.detail(handle)

    await this.profilePhoto.remove(target.id)

    await this.actions.record({
      data: {
        moderatorId: actorId,
        type: ModerationActionType.AVATAR_REMOVED,
        targetUserId: target.id,
      },
    })

    return this.detail(handle)
  }

  private async ensureCanAct({ target, actorId }: EnsureCanActParams): Promise<void> {
    const actor = await this.usersService.getById(actorId)

    if (!canActOn({ actor, target })) throw new AppError(ApiErrorCode.FORBIDDEN)
  }

  private toSummary({ row, moderators }: ToSummaryParams): AdminUserSummary {
    const active: Suspension | undefined =
      row.suspension && isSuspensionActive({ suspension: row.suspension })
        ? row.suspension
        : undefined

    return {
      user: toPrivateProfile(row.user),
      status: accountStatusOf({ user: row.user, activeSuspension: active }),
      suspension: active
        ? toSuspensionView({
            suspension: active,
            moderator: active.moderatorId ? moderators.get(active.moderatorId) : undefined,
          })
        : null,
    }
  }
}
