"use client"

import { Bookmark, Compass, Search, Sunrise } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { FeedList } from "@/components/feed/feed-list"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { Button } from "@/components/ui/button"
import { Segmented, SegmentedList, SegmentedItem } from "@/components/ui/controls"
import { Card, EmptyState } from "@/components/ui/surfaces"
import { queryKeys } from "@/lib/query-keys"

export type HomeTab = "following" | "discover"

export function HomeFeed(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab: HomeTab = viewer && searchParams.get("tab") !== "discover" ? "following" : "discover"

  const changeTab = (next: string): void => {
    router.replace(next === "discover" ? "/home?tab=discover" : "/home", { scroll: false })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <h1 className="font-serif text-[25px] font-semibold">{t("web.feed.title")}</h1>
        {viewer ? (
          <Segmented value={tab} onValueChange={changeTab}>
            <SegmentedList className="w-70">
              <SegmentedItem value="following">{t("web.feed.following")}</SegmentedItem>
              <SegmentedItem value="discover">{t("web.feed.discover")}</SegmentedItem>
            </SegmentedList>
          </Segmented>
        ) : null}
      </div>
      <p className="text-[13px] text-subtle">
        {tab === "following" ? t("web.feed.chronological") : t("web.feed.discoverNote")}
      </p>
      {tab === "following" ? (
        <FeedList
          key="following"
          queryKey={queryKeys.feed.following}
          load={(cursor) => api.feed.following({ cursor })}
          empty={
            <Card>
              <EmptyState
                icon={<Compass className="size-8" />}
                tone="brand"
                title={t("web.feed.emptyFollowingTitle")}
                description={t("web.feed.emptyFollowingBody")}
              >
                <Button asChild variant="secondary">
                  <Link href="/home?tab=discover">{t("web.feed.discover")}</Link>
                </Button>
              </EmptyState>
            </Card>
          }
          end={
            <Card>
              <EmptyState
                icon={<Sunrise className="size-8" />}
                tone="brand"
                title={t("web.feed.caughtUpTitle")}
                description={t("web.feed.caughtUpBody")}
              >
                <Button asChild variant="secondary">
                  <Link href="/home?tab=discover">
                    <Search aria-hidden className="size-4" />
                    {t("web.feed.exploreDiscussions")}
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/saved">
                    <Bookmark aria-hidden className="size-4" />
                    {t("web.nav.saved")}
                  </Link>
                </Button>
              </EmptyState>
            </Card>
          }
        />
      ) : (
        <FeedList
          key="discover"
          queryKey={queryKeys.feed.discover}
          load={(cursor) => api.feed.discover({ cursor })}
          empty={
            <Card>
              <EmptyState
                icon={<Compass className="size-8" />}
                title={t("web.feed.emptyDiscoverTitle")}
                description={t("web.feed.emptyDiscoverBody")}
              />
            </Card>
          }
        />
      )}
    </div>
  )
}
