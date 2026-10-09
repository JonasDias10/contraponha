import type { SuspensionRow } from "@contraponha/database"
import { AccountStatus, type SuspensionView } from "@contraponha/types"

import { toPublicProfile, type User } from "#src/modules/users/domain/user.js"

export type Suspension = SuspensionRow

export interface IsSuspensionActiveParams {
  suspension: Suspension
  now?: Date
}

export function isSuspensionActive({
  suspension,
  now = new Date(),
}: IsSuspensionActiveParams): boolean {
  if (suspension.liftedAt) return false

  return suspension.endsAt === null || suspension.endsAt > now
}

export interface AccountStatusParams {
  user: User
  activeSuspension: Suspension | undefined
}

export function accountStatusOf({ user, activeSuspension }: AccountStatusParams): AccountStatus {
  if (user.deletedAt) return AccountStatus.DELETED

  if (activeSuspension)
    return activeSuspension.endsAt ? AccountStatus.SUSPENDED : AccountStatus.BANNED

  if (user.deletionScheduledAt) return AccountStatus.DELETION_SCHEDULED

  return AccountStatus.ACTIVE
}

export interface ToSuspensionViewParams {
  suspension: Suspension
  moderator: User | undefined
}

export function toSuspensionView({
  suspension,
  moderator,
}: ToSuspensionViewParams): SuspensionView {
  return {
    id: suspension.id,
    rule: suspension.rule,
    note: suspension.note,
    endsAt: suspension.endsAt?.toISOString() ?? null,
    createdAt: suspension.createdAt.toISOString(),
    liftedAt: suspension.liftedAt?.toISOString() ?? null,
    moderator: moderator ? toPublicProfile(moderator) : null,
    isActive: isSuspensionActive({ suspension }),
  }
}
