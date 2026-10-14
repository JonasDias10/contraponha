"use client"

import { Inbox } from "lucide-react"
import Link from "next/link"
import { queryKeys } from "@contraponha/client-core"
import { useBookmarkCount } from "@contraponha/client-core/react"

import { FeedList } from "@/components/feed/feed-list"
import { Button, Card, EmptyState, useApi, useI18n } from "@contraponha/web-ui"

export function SavedPosts(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const count = useBookmarkCount()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 pb-2">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-serif text-[25px] font-semibold">{t("web.saved.title")}</h1>
          {count ? (
            <span className="text-[13px] text-subtle">{t("web.saved.count", { count })}</span>
          ) : null}
        </div>
        <p className="text-[13px] text-subtle">{t("web.saved.lead")}</p>
      </div>
      <FeedList
        queryKey={queryKeys.bookmarks}
        load={async (cursor) => {
          const page = await api.posts.listBookmarks({ cursor })
          return {
            items: page.items.map((post) => ({ post, reason: null, repostedBy: null })),
            nextCursor: page.nextCursor,
          }
        }}
        empty={
          <Card>
            <EmptyState
              icon={<Inbox className="size-8" />}
              title={t("web.saved.emptyTitle")}
              description={t("web.saved.emptyBody")}
            >
              <Button asChild variant="secondary">
                <Link href="/home?tab=discover">{t("web.saved.explore")}</Link>
              </Button>
            </EmptyState>
          </Card>
        }
      />
    </div>
  )
}
