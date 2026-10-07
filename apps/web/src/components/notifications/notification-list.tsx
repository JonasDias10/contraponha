"use client"

import { NotificationFilter } from "@contraponha/types"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BellOff, CalendarClock } from "lucide-react"
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
        <h1 className="font-serif text-[25px] font-semibold">{t("web.notifications.title")}</h1>
        <Segmented value={filter} onValueChange={(value) => isFilter(value) && setFilter(value)}>
          <SegmentedList className="w-90 max-w-full">
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
          className="self-end"
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
            <Card key={period} className="overflow-hidden">
              <h2 className="px-5 pt-4 pb-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">
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
