import { UserRole, type PrivateProfile } from "@contraponha/types"

export function canModerate(viewer: PrivateProfile | null): boolean {
  return viewer?.role === UserRole.MODERATOR || viewer?.role === UserRole.ADMIN
}

export function isAdmin(viewer: PrivateProfile | null): boolean {
  return viewer?.role === UserRole.ADMIN
}

const RANK: Record<UserRole, number> = {
  [UserRole.MEMBER]: 0,
  [UserRole.MODERATOR]: 1,
  [UserRole.ADMIN]: 2,
}

export interface CanActOnParams {
  actor: Pick<PrivateProfile, "id" | "role">
  target: Pick<PrivateProfile, "id" | "role">
}

// Suspensions and photo removal: moderators act on members, admins also on moderators.
// Nobody acts on themselves or on someone with the same or a higher role.
export function canActOn({ actor, target }: CanActOnParams): boolean {
  return actor.id !== target.id && RANK[actor.role] > RANK[target.role]
}
