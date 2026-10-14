"use client"

import { queryKeys } from "@contraponha/client-core"
import { Card, EmptyState, useApi, useI18n } from "@contraponha/web-ui"
import { MessageSquareQuote } from "lucide-react"

import { FeedList } from "@/components/feed/feed-list"

export interface PostQuotesProps {
  postId: string
}

export function PostQuotes({ postId }: PostQuotesProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  return (
    <div className="flex flex-col gap-4">
      <h1 className="pb-2 font-serif text-[25px] font-semibold">{t("web.repost.quotesTitle")}</h1>
      <FeedList
        queryKey={queryKeys.quotes(postId)}
        load={async (cursor) => {
          const page = await api.posts.listQuotes({ postId, query: { cursor } })

          return {
            items: page.items.map((post) => ({ post, reason: null, repostedBy: null })),
            nextCursor: page.nextCursor,
          }
        }}
        empty={
          <Card>
            <EmptyState
              icon={<MessageSquareQuote className="size-8" />}
              title={t("web.repost.noQuotes")}
            />
          </Card>
        }
      />
    </div>
  )
}
