"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { queryKeys } from "@contraponha/client-core"

import { ContributionCard } from "@/components/discussion/contribution-card"
import { PostCardSkeleton } from "@/components/feed/feed-list"
import { PostCard } from "@/components/post/post-card"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/cn"

const FIRST_PAGE: string | undefined = undefined

const TABS = [
  { value: "posts", key: "web.profile.posts" },
  { value: "contributions", key: "web.profile.contributions" },
  { value: "highlighted", key: "web.profile.highlighted" },
] as const

type ProfileTab = (typeof TABS)[number]["value"]

function isTab(value: string | null): value is ProfileTab {
  return TABS.some((tab) => tab.value === value)
}

export interface ProfileTabsProps {
  handle: string
}

export function ProfileTabs({ handle }: ProfileTabsProps): React.JSX.Element {
  const { t } = useI18n()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requested = searchParams.get("tab")
  const tab: ProfileTab = isTab(requested) ? requested : "posts"

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={t("web.profile.posts")} className="flex gap-6 border-b border-line">
        {TABS.map(({ value, key }) => (
          <Link
            key={value}
            href={{ pathname, query: value === "posts" ? {} : { tab: value } }}
            scroll={false}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 py-3 text-[15px] font-medium no-underline",
              tab === value
                ? "border-ink font-semibold text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t(key)}
          </Link>
        ))}
      </nav>
      {tab === "posts" ? (
        <ProfilePosts handle={handle} />
      ) : (
        <ProfileContributions handle={handle} onlyHighlighted={tab === "highlighted"} />
      )}
    </div>
  )
}

interface ProfileListProps {
  handle: string
}

function ProfilePosts({ handle }: ProfileListProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  const query = useInfiniteQuery({
    queryKey: queryKeys.profilePosts(handle),
    queryFn: ({ pageParam }) => api.posts.listByUser({ handle, query: { cursor: pageParam } }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  if (query.isPending) return <PostCardSkeleton />

  const posts = query.data?.pages.flatMap((page) => page.items) ?? []

  if (posts.length === 0)
    return <p className="py-8 text-center text-muted">{t("web.profile.noPosts")}</p>

  return (
    <div className="flex flex-col gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
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
      ) : null}
    </div>
  )
}

interface ProfileContributionsProps extends ProfileListProps {
  onlyHighlighted: boolean
}

function ProfileContributions({
  handle,
  onlyHighlighted,
}: ProfileContributionsProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  const query = useInfiniteQuery({
    queryKey: queryKeys.contributions({ handle, onlyHighlighted }),
    queryFn: ({ pageParam }) =>
      api.comments.listContributions({ handle, onlyHighlighted, query: { cursor: pageParam } }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  if (query.isPending) return <PostCardSkeleton />

  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-muted">
        {onlyHighlighted ? t("web.profile.noHighlighted") : t("web.profile.noContributions")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((contribution) => (
        <ContributionCard key={contribution.comment.id} contribution={contribution} />
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
      ) : null}
    </div>
  )
}
