"use client"

import { Inbox } from "lucide-react"
import Link from "next/link"
import { queryKeys } from "@contraponha/client-core"

import { FeedList } from "@/components/feed/feed-list"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Card, EmptyState } from "@/components/ui/surfaces"

export function SavedPosts(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 pb-2">
        <h1 className="font-serif text-[25px] font-semibold">{t("web.saved.title")}</h1>
        <p className="text-[13px] text-subtle">{t("web.saved.lead")}</p>
      </div>
      <FeedList
        queryKey={queryKeys.bookmarks}
        load={async (cursor) => {
          const page = await api.posts.listBookmarks({ cursor })
          return {
            items: page.items.map((post) => ({ post, reason: null })),
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
