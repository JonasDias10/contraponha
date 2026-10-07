"use client"

import type { FeedItem, Page } from "@ponto/types"
import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query"
import { WifiOff } from "lucide-react"

import { PostCard } from "@/components/post/post-card"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { EmptyState, Skeleton } from "@/components/ui/surfaces"

const FIRST_PAGE: string | undefined = undefined

export interface FeedListProps {
  queryKey: QueryKey
  load: (cursor: string | undefined) => Promise<Page<FeedItem>>
  empty: React.ReactNode
  end?: React.ReactNode
}

export function PostCardSkeleton(): React.JSX.Element {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-4 rounded-lg border border-line bg-surface-raised p-5"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-2/5" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-4.5 w-4/5" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-11/12" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  )
}

export function FeedList({ queryKey, load, empty, end }: FeedListProps): React.JSX.Element {
  const { t } = useI18n()

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => load(pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <PostCardSkeleton />
        <PostCardSkeleton />
      </div>
    )
  }

  if (query.isError) {
    return (
      <EmptyState
        icon={<WifiOff className="size-8" />}
        tone="danger"
        title={t("web.errors.errorTitle")}
        description={t("web.feed.loadError")}
      >
        <Button onClick={() => void query.refetch()}>{t("web.common.retry")}</Button>
      </EmptyState>
    )
  }

  const items = query.data.pages.flatMap((page) => page.items)

  if (items.length === 0) return <>{empty}</>

  return (
    <div className="flex flex-col gap-4">
      {items.map(({ post, reason }) => (
        <PostCard key={post.id} post={post} reason={reason} />
      ))}
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          className="self-center"
          isLoading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("web.common.loadMore")}
        </Button>
      ) : (
        end
      )}
    </div>
  )
}
