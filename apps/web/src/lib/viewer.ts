import "server-only"

import { ApiError } from "@contraponha/api-client"
import type { PrivateProfile } from "@contraponha/types"
import { redirect } from "next/navigation"
import { cache } from "react"

import { createServerApiClient } from "./api"
import { getRequestLocale } from "./i18n"
import { getSessionToken } from "./session"

// The signed-in person for this request, or null. Cached per request, so layouts and
// pages can both ask without a second API call.
export const getViewer = cache(async (): Promise<PrivateProfile | null> => {
  const token = await getSessionToken()

  if (!token) return null

  const locale = await getRequestLocale()

  try {
    return await createServerApiClient(locale).users.me()
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null

    throw error
  }
})

export async function requireViewer(): Promise<PrivateProfile> {
  const viewer = await getViewer()

  if (!viewer) redirect("/login")

  return viewer
}
