import { ApiError } from "@contraponha/api-client"
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { cache } from "react"
import { queryKeys } from "@contraponha/client-core"

import { HomeRail } from "@/components/feed/home-rail"
import { TopicPage } from "@/components/feed/topic-page"
import { AppShell } from "@/components/layout/app-shell"
import { createServerApiClient } from "@/lib/api"
import { getRequestTranslator } from "@/lib/i18n"
import { getServerQueryClient } from "@/lib/server-query"

const loadTopic = cache(async (slug: string) => {
  const { locale } = await getRequestTranslator()

  try {
    return await createServerApiClient(locale).topics.get(slug)
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound()

    throw error
  }
})

export async function generateMetadata({ params }: PageProps<"/topics/[slug]">): Promise<Metadata> {
  const { slug } = await params
  const topic = await loadTopic(slug)

  return { title: topic.isCurated ? topic.name : `#${topic.slug}` }
}

export default async function TopicRoute({
  params,
}: PageProps<"/topics/[slug]">): Promise<React.JSX.Element> {
  const { slug } = await params
  const topic = await loadTopic(slug)
  const queryClient = getServerQueryClient()

  queryClient.setQueryData(queryKeys.topics.one(slug), topic)

  return (
    <AppShell rail={<HomeRail />}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <TopicPage slug={slug} />
      </HydrationBoundary>
    </AppShell>
  )
}
