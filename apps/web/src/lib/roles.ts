import { UserRole, type PrivateProfile } from "@ponto/types"

export function canModerate(viewer: PrivateProfile | null): boolean {
  return viewer?.role === UserRole.MODERATOR || viewer?.role === UserRole.ADMIN
}
