"use client"

import { formatCount } from "@contraponha/client-core"
import type { DailyMetric } from "@contraponha/types"
import { useI18n } from "@contraponha/web-ui"
import { useState } from "react"

export type DailySeries = Exclude<keyof DailyMetric, "date">

export interface DailyBarsProps {
  title: string
  series: DailySeries
  daily: DailyMetric[]
}

const CHART_HEIGHT = 96
const BAR_GAP = 2

interface FormatDayParams {
  date: string
  locale: string
}

function formatDay({ date, locale }: FormatDayParams): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

// One series per chart (small multiples), so every chart keeps a single axis and one color.
export function DailyBars({ title, series, daily }: DailyBarsProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const [hovered, setHovered] = useState<number | null>(null)
  const values = daily.map((day) => day[series])
  const peak = Math.max(1, ...values)
  const total = values.reduce((sum, value) => sum + value, 0)
  const focus = hovered === null ? null : daily[hovered]
  const first = daily[0]
  const last = daily.at(-1)

  return (
    <figure className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-[13px] text-muted tabular-nums">
          {focus
            ? `${formatDay({ date: focus.date, locale })} · ${formatCount({ value: focus[series], locale })}`
            : formatCount({ value: total, locale })}
        </span>
      </figcaption>
      <div
        className="flex items-end border-b border-line"
        style={{ height: CHART_HEIGHT, gap: BAR_GAP }}
        onMouseLeave={() => setHovered(null)}
        aria-hidden
      >
        {daily.map((day, index) => (
          <div
            key={day.date}
            className="flex h-full min-w-0 flex-1 items-end"
            onMouseEnter={() => setHovered(index)}
          >
            <div
              className={
                hovered === index
                  ? "w-full rounded-t-[4px] bg-ink"
                  : "w-full rounded-t-[4px] bg-brand"
              }
              style={{
                height: `${(day[series] / peak) * 100}%`,
                minHeight: day[series] > 0 ? 2 : 0,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-subtle" aria-hidden>
        <span>{first ? formatDay({ date: first.date, locale }) : ""}</span>
        <span>{last ? formatDay({ date: last.date, locale }) : ""}</span>
      </div>
      <table className="sr-only">
        <caption>{t("hub.dashboard.chartLabel", { series: title, days: daily.length })}</caption>
        <tbody>
          {daily.map((day) => (
            <tr key={day.date}>
              <th scope="row">{formatDay({ date: day.date, locale })}</th>
              <td>{day[series]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
