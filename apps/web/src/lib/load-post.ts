import "server-only"

import { ApiError } from "@contraponha/api-client"
import { getRequestTranslator } from "@contraponha/next-server"
import type { PostView } from "@contraponha/types"
import { notFound } from "next/navigation"
import { cache } from "react"

import { createServerApiClient } from "./api"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Cached per request: the page, its metadata and its share image share one API call.
export const loadPost = cache(async (postId: string): Promise<PostView> => {
  if (!UUID_PATTERN.test(postId)) notFound()

  const { locale } = await getRequestTranslator()

  try {
    return await createServerApiClient(locale).posts.get(postId)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()

    throw error
  }
})
