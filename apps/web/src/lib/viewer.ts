import "server-only"

import { fetchViewer, getRequestLocale } from "@contraponha/next-server"
import type { PrivateProfile } from "@contraponha/types"
import { redirect } from "next/navigation"
import { cache } from "react"

import { getWebEnv } from "./env"

// The signed-in person for this request, or null. Cached per request, so layouts and
// pages can both ask without a second API call.
export const getViewer = cache(async (): Promise<PrivateProfile | null> => {
  const locale = await getRequestLocale()

  return fetchViewer({ apiUrl: getWebEnv().API_URL, locale })
})

export async function requireViewer(): Promise<PrivateProfile> {
  const viewer = await getViewer()

  if (!viewer) redirect("/login")

  return viewer
}
