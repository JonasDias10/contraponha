import { getRequestTranslator } from "@contraponha/next-server"
import type { ImageResponse } from "next/og"

import { loadPost } from "@/lib/load-post"
import { OG_SIZE, renderOgCard } from "@/lib/og-card"

export const size = OG_SIZE
export const contentType = "image/png"

export default async function Image({
  params,
}: PageProps<"/posts/[postId]">): Promise<ImageResponse> {
  const { postId } = await params
  const [post, { t }] = await Promise.all([loadPost(postId), getRequestTranslator()])

  if (post.isDeleted || !post.author) {
    return renderOgCard({
      eyebrow: t("web.post.discussion"),
      title: t("app.tagline"),
      byline: null,
    })
  }

  return renderOgCard({
    eyebrow: t("web.post.discussion"),
    title: post.title ?? post.body ?? "",
    byline: `${post.author.displayName} · @${post.author.handle}`,
  })
}
