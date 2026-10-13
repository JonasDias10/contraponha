import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import type { Metadata } from "next"
import { queryKeys } from "@contraponha/client-core"

import { AppShell } from "@/components/layout/app-shell"
import { AboutAuthor } from "@/components/post/about-author"
import { EditHistory } from "@/components/post/edit-history"
import { PostDetail } from "@/components/post/post-detail"
import { loadPost } from "@/lib/load-post"
import { getServerQueryClient } from "@/lib/server-query"

export async function generateMetadata({
  params,
}: PageProps<"/posts/[postId]">): Promise<Metadata> {
  const { postId } = await params
  const post = await loadPost(postId)
  const description = post.body?.slice(0, 160) ?? undefined

  const title = post.title ?? post.author?.displayName

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `/posts/${post.id}`,
      publishedTime: post.createdAt,
      authors: post.author ? [`/u/${post.author.handle}`] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `/posts/${post.id}` },
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
