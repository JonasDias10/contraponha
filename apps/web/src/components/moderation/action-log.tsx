"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/surfaces"
import { formatDateTime } from "@/lib/format"
import { paths } from "@/lib/paths"
import { queryKeys } from "@/lib/query-keys"

const FIRST_PAGE: string | undefined = undefined

export function ActionLog(): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()

  const query = useInfiniteQuery({
    queryKey: queryKeys.moderationActions,
    queryFn: ({ pageParam }) => api.moderation.listActions({ cursor: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const actions = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="ghost" className="-ml-2.5 self-start px-2.5">
        <Link href="/moderation">
          <ArrowLeft aria-hidden className="size-5" />
          {t("web.moderation.queue")}
        </Link>
      </Button>
      <h1 className="font-serif text-[25px] font-semibold">{t("web.moderation.actions")}</h1>
      <Card className="overflow-hidden">
        <ol>
          {actions.map((action) => (
            <li
              key={action.id}
              className="flex flex-col gap-1 border-t border-line px-5 py-4 first:border-t-0"
            >
              <p className="font-semibold">{t(`web.moderation.action_${action.type}`)}</p>
              <p className="text-sm text-muted">
                {action.moderator?.displayName ?? t("web.moderation.systemActor")} ·{" "}
                {formatDateTime({ value: action.createdAt, locale })}
                {action.rule ? ` · ${t(`web.rules.${action.rule}`)}` : ""}
              </p>
              {action.note ? <p className="text-sm">{action.note}</p> : null}
              {action.postId ? (
                <Link href={paths.post(action.postId)} className="text-sm text-brand">
                  {t("web.moderation.openTarget")}
                </Link>
              ) : null}
            </li>
          ))}
        </ol>
      </Card>
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
