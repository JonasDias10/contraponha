import "server-only"

import { canModerate, isAdmin } from "@contraponha/client-core"
import { fetchViewer, getRequestLocale } from "@contraponha/next-server"
import type { PrivateProfile } from "@contraponha/types"
import { notFound, redirect } from "next/navigation"
import { cache } from "react"

import { getHubEnv } from "./env"

export const getViewer = cache(async (): Promise<PrivateProfile | null> => {
  const locale = await getRequestLocale()

  return fetchViewer({ apiUrl: getHubEnv().API_URL, locale })
})

// The whole hub is for moderators and admins; the API enforces the same rule on every call.
export async function requireStaff(): Promise<PrivateProfile> {
  const viewer = await getViewer()

  if (!viewer || !canModerate(viewer)) redirect("/login")

  // The API refuses staff routes without two-step verification; say so before that happens.
  if (!viewer.isTwoFactorEnabled) redirect("/two-factor-required")

  return viewer
}

export async function requireAdmin(): Promise<PrivateProfile> {
  const viewer = await requireStaff()

  if (!isAdmin(viewer)) notFound()

  return viewer
}
