import { UserRole } from "@contraponha/types"

const RANK: Record<UserRole, number> = {
  [UserRole.MEMBER]: 0,
  [UserRole.MODERATOR]: 1,
  [UserRole.ADMIN]: 2,
}

export interface HasRoleParams {
  role: UserRole
  required: UserRole
}

// Roles are cumulative: an admin can do everything a moderator can.
export function hasRole({ role, required }: HasRoleParams): boolean {
  return RANK[role] >= RANK[required]
}
