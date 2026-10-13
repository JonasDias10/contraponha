import { getRequestTranslator } from "@contraponha/next-server"
import type { Metadata } from "next"

import { PostQuotes } from "@/components/feed/post-quotes"
import { AppShell } from "@/components/layout/app-shell"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()

  return { title: t("web.repost.quotesTitle") }
}

export default async function PostQuotesPage({
  params,
}: PageProps<"/posts/[postId]/quotes">): Promise<React.JSX.Element> {
  const { postId } = await params

  return (
    <AppShell>
      <PostQuotes postId={postId} />
    </AppShell>
  )
}
