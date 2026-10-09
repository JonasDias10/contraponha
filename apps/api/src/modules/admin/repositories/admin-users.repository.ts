import { Inject, Injectable } from "@nestjs/common"
import {
  comments,
  posts,
  reports,
  sessions,
  suspensions,
  users,
  type Database,
} from "@contraponha/database"
import { AccountStatus, type UserRole } from "@contraponha/types"
import { and, count, eq, ilike, isNotNull, isNull, lt, max, or, sql, type SQL } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { Suspension } from "#src/modules/users/domain/suspension.js"
import type { User } from "#src/modules/users/domain/user.js"

export type AdminStatusFilter =
  | typeof AccountStatus.ACTIVE
  | typeof AccountStatus.SUSPENDED
  | typeof AccountStatus.DELETION_SCHEDULED

export interface ListUsersParams {
  q: string | undefined
  role: UserRole | undefined
  status: AdminStatusFilter | undefined
  beforeId: string | undefined
  limit: number
}

export interface AdminUserRow {
  user: User
  suspension: Suspension | null
}

export interface UserActivity {
  reportsAgainst: number
  reportsFiled: number
  lastActiveAt: Date | null
}

function isSuspendedNow(): SQL {
  return sql`(${suspensions.id} is not null and (${suspensions.endsAt} is null or ${suspensions.endsAt} > now()))`
}

function statusCondition(status: AdminStatusFilter | undefined): SQL | undefined {
  if (status === AccountStatus.SUSPENDED) return isSuspendedNow()

  if (status === AccountStatus.DELETION_SCHEDULED)
    return and(isNotNull(users.deletionScheduledAt), isNull(users.deletedAt))

  if (status === AccountStatus.ACTIVE) {
    return and(
      isNull(users.deletedAt),
      isNull(users.deletionScheduledAt),
      sql`not (${isSuspendedNow()})`,
    )
  }

  return undefined
}

// Read model for the admin hub. It reads across users, suspensions, reports and sessions
// on purpose: these are reporting queries with no writes, so going through each module's
// service would only add round trips.
@Injectable()
export class AdminUsersRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list({ q, role, status, beforeId, limit }: ListUsersParams): Promise<AdminUserRow[]> {
    const pattern = q ? `%${q}%` : undefined

    return this.db
      .select({ user: users, suspension: suspensions })
      .from(users)
      .leftJoin(suspensions, and(eq(suspensions.userId, users.id), isNull(suspensions.liftedAt)))
      .where(
        and(
          pattern
            ? or(
                ilike(users.handle, pattern),
                ilike(users.displayName, pattern),
                ilike(users.email, pattern),
              )
            : undefined,
          role ? eq(users.role, role) : undefined,
          statusCondition(status),
          beforeId ? lt(users.id, beforeId) : undefined,
        ),
      )
      .orderBy(sql`${users.id} desc`)
      .limit(limit)
  }

  async activity(userId: string): Promise<UserActivity> {
    const [against] = await this.db
      .select({ total: count() })
      .from(reports)
      .leftJoin(posts, eq(posts.id, reports.postId))
      .leftJoin(comments, eq(comments.id, reports.commentId))
      .where(
        or(
          eq(reports.targetUserId, userId),
          eq(posts.authorId, userId),
          eq(comments.authorId, userId),
        ),
      )

    const [filed] = await this.db
      .select({ total: count() })
      .from(reports)
      .where(eq(reports.reporterId, userId))

    const [seen] = await this.db
      .select({ lastActiveAt: max(sessions.lastUsedAt) })
      .from(sessions)
      .where(eq(sessions.userId, userId))

    return {
      reportsAgainst: against?.total ?? 0,
      reportsFiled: filed?.total ?? 0,
      lastActiveAt: seen?.lastActiveAt ?? null,
    }
  }
}
