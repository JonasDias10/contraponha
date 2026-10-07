import { UserRole, type PrivateProfile } from "@contraponha/types"

export function canModerate(viewer: PrivateProfile | null): boolean {
  return viewer?.role === UserRole.MODERATOR || viewer?.role === UserRole.ADMIN
}
