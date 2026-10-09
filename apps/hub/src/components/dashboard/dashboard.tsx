"use client"

import { formatCount } from "@contraponha/client-core"
import type { MessageKey } from "@contraponha/i18n"
import type { AdminMetrics } from "@contraponha/types"
import {
  Card,
  Segmented,
  SegmentedItem,
  SegmentedList,
  Skeleton,
  useApi,
  useI18n,
} from "@contraponha/web-ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"

import { DailyBars, type DailySeries } from "@/components/dashboard/daily-bars"
import { hubQueryKeys } from "@/lib/query-keys"

const RANGES = [7, 30, 90] as const

type Range = (typeof RANGES)[number]

interface TotalTile {
  key: keyof AdminMetrics["totals"]
  label: MessageKey
}

interface SeriesChart {
  key: DailySeries
  label: MessageKey
}

const TOTALS: TotalTile[] = [
  { key: "users", label: "hub.dashboard.users" },
  { key: "activeUsers7d", label: "hub.dashboard.activeUsers7d" },
  { key: "posts", label: "hub.dashboard.posts" },
  { key: "comments", label: "hub.dashboard.comments" },
  { key: "openReports", label: "hub.dashboard.openReports" },
  { key: "activeSuspensions", label: "hub.dashboard.activeSuspensions" },
]

const SERIES: SeriesChart[] = [
  { key: "signups", label: "hub.dashboard.signups" },
  { key: "posts", label: "hub.dashboard.posts" },
  { key: "comments", label: "hub.dashboard.comments" },
  { key: "reports", label: "hub.dashboard.reports" },
]

function rangeOf(value: string): Range | undefined {
  return RANGES.find((range) => String(range) === value)
}

export function Dashboard(): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()
  const [days, setDays] = useState<Range>(30)

  const query = useQuery({
    queryKey: hubQueryKeys.metrics(days),
    queryFn: () => api.admin.metrics({ days }),
  })

  const metrics = query.data

  return (
    <>
      <h1 className="font-serif text-[28px] font-semibold">{t("hub.dashboard.title")}</h1>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {TOTALS.map(({ key, label }) => (
          <Card key={key} className="flex flex-col gap-1 p-4">
            <dt className="text-[13px] text-muted">{t(label)}</dt>
            <dd className="font-serif text-[28px] leading-tight font-semibold tabular-nums">
              {metrics ? (
                formatCount({ value: metrics.totals[key], locale })
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </dd>
          </Card>
        ))}
      </dl>
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{t("hub.dashboard.activity")}</h2>
            <p className="text-sm text-muted">{t("hub.dashboard.activityLead", { days })}</p>
          </div>
          <Segmented
            value={String(days)}
            onValueChange={(value) => {
              const range = rangeOf(value)

              if (range) setDays(range)
            }}
          >
            <SegmentedList aria-label={t("hub.dashboard.range")}>
              {RANGES.map((range) => (
                <SegmentedItem key={range} value={String(range)}>
                  {t("hub.dashboard.days", { count: range })}
                </SegmentedItem>
              ))}
            </SegmentedList>
          </Segmented>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {SERIES.map(({ key, label }) =>
            metrics ? (
              <DailyBars key={key} title={t(label)} series={key} daily={metrics.daily} />
            ) : (
              <Skeleton key={key} className="h-48" />
            ),
          )}
        </div>
      </section>
    </>
  )
}
