"use client"

import { NotificationFilter } from "@contraponha/types"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BellOff, CalendarClock, CheckCheck } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { NotificationItem } from "@/components/notifications/notification-item"
import { periodOf, type NotificationPeriod } from "@/components/notifications/notification-text"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Segmented, SegmentedItem, SegmentedList } from "@/components/ui/controls"
import { Banner, Card, EmptyState, Skeleton } from "@/components/ui/surfaces"
import { queryKeys } from "@/lib/query-keys"

const FIRST_PAGE: string | undefined = undefined
const PERIODS: NotificationPeriod[] = ["today", "thisWeek", "earlier"]

function isFilter(value: string): value is NotificationFilter {
  return Object.values(NotificationFilter).some((filter) => filter === value)
}

export function NotificationList(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<NotificationFilter>(NotificationFilter.ALL)

  const query = useInfiniteQuery({
    queryKey: queryKeys.notifications(filter),
    queryFn: ({ pageParam }) => api.notifications.list({ filter, cursor: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const preferences = useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => api.notifications.getPreferences(),
  })

  const markAll = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll }),
  })

  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const now = new Date()
  const hasUnread = items.some(({ isRead }) => !isRead)
  const digestHours = preferences.data?.digestHours ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
          <h1 className="font-serif text-[25px] font-semibold">{t("web.notifications.title")}</h1>
          {hasUnread ? (
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2.5 sm:hidden"
              aria-label={t("web.notifications.markAllRead")}
              title={t("web.notifications.markAllRead")}
              isLoading={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              <CheckCheck aria-hidden className="size-5" />
            </Button>
          ) : null}
        </div>
        <Segmented
          value={filter}
          onValueChange={(value) => isFilter(value) && setFilter(value)}
          className="w-full sm:w-auto"
        >
          <SegmentedList className="w-full sm:w-90">
            <SegmentedItem value={NotificationFilter.ALL}>
              {t("web.notifications.all")}
            </SegmentedItem>
            <SegmentedItem value={NotificationFilter.MENTIONS}>
              {t("web.notifications.mentions")}
            </SegmentedItem>
            <SegmentedItem value={NotificationFilter.MODERATION}>
              {t("web.notifications.moderation")}
            </SegmentedItem>
          </SegmentedList>
        </Segmented>
      </div>
      {digestHours.length > 0 ? (
        <Banner tone="neutral" icon={<CalendarClock className="size-5" />}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {t("web.notifications.digestBanner", {
                hours: digestHours.map((hour) => `${hour}h`).join(", "),
              })}
            </span>
            <Link href="/settings/notifications" className="font-semibold text-brand">
              {t("web.notifications.changeHours")}
            </Link>
          </div>
        </Banner>
      ) : null}
      {hasUnread ? (
        <Button
          variant="ghost"
          size="sm"
          className="hidden self-end sm:inline-flex"
          isLoading={markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          {t("web.notifications.markAllRead")}
        </Button>
      ) : null}
      {query.isPending ? (
        <Card className="flex flex-col gap-4 p-5" aria-busy>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<BellOff className="size-8" />}
            title={t("web.notifications.emptyTitle")}
            description={t("web.notifications.emptyBody")}
          />
        </Card>
      ) : (
        PERIODS.map((period) => {
          const inPeriod = items.filter(({ createdAt }) => periodOf({ createdAt, now }) === period)

          if (inPeriod.length === 0) return null

          return (
            <Card
              key={period}
              className="-mx-4 overflow-hidden rounded-none border-x-0 sm:mx-0 sm:rounded-lg sm:border-x"
            >
              <h2 className="px-4 pt-4 pb-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase sm:px-5">
                {t(`web.notifications.${period}`)}
              </h2>
              <ul>
                {inPeriod.map((notification) => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </ul>
            </Card>
          )
        })
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
      ) : items.length > 0 ? (
        <p className="py-2 text-center text-[13px] text-subtle">{t("web.notifications.end")}</p>
      ) : null}
    </div>
  )
}
