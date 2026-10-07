import "server-only"

import type { PrivateProfile } from "@contraponha/types"
import { notFound } from "next/navigation"

import { canModerate } from "./roles"
import { requireViewer } from "./viewer"

// Moderation pages do not exist for members; the API enforces the same rule on every call.
export async function requireModerator(): Promise<PrivateProfile> {
  const viewer = await requireViewer()

  if (!canModerate(viewer)) notFound()

  return viewer
}
