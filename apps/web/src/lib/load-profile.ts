import "server-only"

import { ApiError } from "@ponto/api-client"
import type { ProfileView } from "@ponto/types"
import { notFound } from "next/navigation"
import { cache } from "react"

import { createServerApiClient } from "./api"
import { getRequestTranslator } from "./i18n"

// Cached per request: metadata and the page share one API call.
export const loadProfile = cache(async (handle: string): Promise<ProfileView> => {
  const { locale } = await getRequestTranslator()

  try {
    return await createServerApiClient(locale).users.getByHandle(handle.toLowerCase())
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound()

    throw error
  }
})
