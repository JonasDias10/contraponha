"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { ArrowLeft, Users } from "lucide-react"
import Link from "next/link"
import { queryKeys } from "@contraponha/client-core"

import { PersonRow } from "@/components/profile/person-row"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { Button } from "@/components/ui/button"
import { Card, EmptyState, Skeleton } from "@/components/ui/surfaces"
import { cn } from "@/lib/cn"
import { paths } from "@/lib/paths"

const FIRST_PAGE: string | undefined = undefined

export type ConnectionDirection = "followers" | "following"

export interface ConnectionsListProps {
  handle: string
  displayName: string
  direction: ConnectionDirection
}

export function ConnectionsList({
  handle,
  displayName,
  direction,
}: ConnectionsListProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()

  const query = useInfiniteQuery({
    queryKey: queryKeys.connections({ handle, direction }),
    queryFn: ({ pageParam }) =>
      direction === "followers"
        ? api.follows.listFollowers({ handle, query: { cursor: pageParam } })
        : api.follows.listFollowing({ handle, query: { cursor: pageParam } }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const people = query.data?.pages.flatMap((page) => page.items) ?? []
  const userIds = people.map(({ id }) => id)

  // One request for the whole list, so each row knows whether the reader follows that person.
  const followed = useQuery({
    queryKey: queryKeys.followedAmong(userIds),
    queryFn: () => api.follows.followedAmong(userIds),
    enabled: viewer !== null && userIds.length > 0,
  })

  const followedIds = new Set(followed.data?.userIds ?? [])
  const isStatusReady = viewer === null || followed.isSuccess

  const tabs = [
    { value: "followers", href: paths.followers(handle), label: t("web.profile.statFollowers") },
    { value: "following", href: paths.following(handle), label: t("web.profile.statFollowing") },
  ] as const

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" className="-ml-2.5 self-start px-2.5">
        <Link href={paths.profile(handle)}>
          <ArrowLeft aria-hidden className="size-5" />
          {t("web.profile.backToProfile")}
        </Link>
      </Button>
      <h1 className="font-serif text-[25px] font-semibold">
        {direction === "followers"
          ? t("web.profile.followersTitle", { name: displayName })
          : t("web.profile.followingTitle", { name: displayName })}
      </h1>
      <nav aria-label={displayName} className="flex gap-6 border-b border-line">
        {tabs.map(({ value, href, label }) => (
          <Link
            key={value}
            href={href}
            aria-current={direction === value ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 py-3 text-[15px] font-medium capitalize no-underline",
              direction === value
                ? "border-ink font-semibold text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {query.isPending ? (
        <Card className="flex flex-col gap-4 p-5" aria-busy>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </Card>
      ) : people.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="size-8" />}
            title={
              direction === "followers"
                ? t("web.profile.noFollowers")
                : t("web.profile.noFollowing")
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {people.map((person) => (
              <PersonRow
                key={`${person.id}-${String(isStatusReady)}`}
                person={person}
                isFollowing={isStatusReady ? followedIds.has(person.id) : undefined}
              />
            ))}
          </ul>
        </Card>
      )}
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
