"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import { formatDateTime, queryKeys } from "@contraponha/client-core"

import { Button, Card, useApi, useI18n } from "@contraponha/web-ui"
import { webLinks } from "@/lib/web-links"

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
      <h1 className="font-serif text-[28px] font-semibold">{t("web.moderation.actions")}</h1>
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
                <a
                  href={webLinks.post(action.postId)}
                  target="_blank"
                  rel="noopener"
                  className="text-sm text-brand"
                >
                  {t("web.moderation.openTarget")}
                </a>
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
