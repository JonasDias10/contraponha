import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import type { Metadata } from "next"
import { Suspense } from "react"
import { queryKeys } from "@contraponha/client-core"

import { HomeFeed } from "@/components/feed/home-feed"
import { HomeRail } from "@/components/feed/home-rail"
import { AppShell } from "@/components/layout/app-shell"
import { createServerApiClient } from "@/lib/api"
import { getRequestTranslator } from "@/lib/i18n"
import { getServerQueryClient } from "@/lib/server-query"
import { getViewer } from "@/lib/viewer"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.feed.title") }
}

export default async function HomePage({
  searchParams,
}: PageProps<"/home">): Promise<React.JSX.Element> {
  const { locale } = await getRequestTranslator()
  const viewer = await getViewer()
  const { tab } = await searchParams
  const api = createServerApiClient(locale)
  const queryClient = getServerQueryClient()
  const isFollowing = viewer !== null && tab !== "discover"

  await queryClient.prefetchInfiniteQuery({
    queryKey: isFollowing ? queryKeys.feed.following : queryKeys.feed.discover,
    queryFn: () => (isFollowing ? api.feed.following() : api.feed.discover()),
    initialPageParam: undefined,
  })

  return (
    <AppShell rail={<HomeRail />}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense>
          <HomeFeed />
        </Suspense>
      </HydrationBoundary>
    </AppShell>
  )
}
