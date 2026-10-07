import { ApiError } from "@contraponha/api-client"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { queryKeys } from "@contraponha/client-core"

import { AppShell } from "@/components/layout/app-shell"
import { AboutAuthor } from "@/components/post/about-author"
import { EditHistory } from "@/components/post/edit-history"
import { PostDetail } from "@/components/post/post-detail"
import { createServerApiClient } from "@/lib/api"
import { getRequestTranslator } from "@/lib/i18n"
import { getServerQueryClient } from "@/lib/server-query"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const loadPost = cache(async (postId: string) => {
  if (!UUID_PATTERN.test(postId)) notFound()

  const { locale } = await getRequestTranslator()

  try {
    return await createServerApiClient(locale).posts.get(postId)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound()

    throw error
  }
})

export async function generateMetadata({
  params,
}: PageProps<"/posts/[postId]">): Promise<Metadata> {
  const { postId } = await params
  const post = await loadPost(postId)
  const description = post.body?.slice(0, 160) ?? undefined

  return {
    title: post.title ?? post.author?.displayName,
    description,
    openGraph: { title: post.title ?? undefined, description, type: "article" },
  }
}

export default async function PostPage({
  params,
}: PageProps<"/posts/[postId]">): Promise<React.JSX.Element> {
  const { postId } = await params
  const post = await loadPost(postId)
  const queryClient = getServerQueryClient()

  queryClient.setQueryData(queryKeys.post(postId), post)

  return (
    <AppShell
      rail={
        <HydrationBoundary state={dehydrate(queryClient)}>
          {post.editedAt && !post.isDeleted ? (
            <div id="history" className="scroll-mt-6">
              <EditHistory post={post} />
            </div>
          ) : null}
          {post.author && !post.author.isDeleted ? (
            <AboutAuthor handle={post.author.handle} />
          ) : null}
        </HydrationBoundary>
      }
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PostDetail postId={postId} />
      </HydrationBoundary>
    </AppShell>
  )
}
