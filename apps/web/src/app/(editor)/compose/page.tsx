import { getRequestTranslator, getRequestLocale } from "@contraponha/next-server"
import type { QuotedPostView } from "@contraponha/types"
import { ViewerProvider } from "@contraponha/web-ui"
import type { Metadata } from "next"

import { Composer } from "@/components/composer/composer"
import { createServerApiClient } from "@/lib/api"
import { requireViewer } from "@/lib/viewer"

const EXCERPT_LENGTH = 280

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.composer.newPost") }
}

// `?quote=<postId>` opens the composer quoting that post; a missing or removed post is
// simply left out.
async function loadQuoted(postId: string | undefined): Promise<QuotedPostView | undefined> {
  if (!postId) return undefined

  const locale = await getRequestLocale()

  const post = await createServerApiClient(locale)
    .posts.get(postId)
    .catch(() => undefined)

  if (!post || post.isDeleted) return undefined

  return {
    id: post.id,
    title: post.title,
    excerpt: post.body ? post.body.slice(0, EXCERPT_LENGTH) : null,
    author: post.author,
    createdAt: post.createdAt,
    isDeleted: false,
  }
}

export default async function ComposePage({
  searchParams,
}: PageProps<"/compose">): Promise<React.JSX.Element> {
  const viewer = await requireViewer()
  const { quote } = await searchParams
  const quoted = await loadQuoted(typeof quote === "string" ? quote : undefined)

  return (
    <ViewerProvider viewer={viewer}>
      <Composer quoted={quoted} />
    </ViewerProvider>
  )
}
