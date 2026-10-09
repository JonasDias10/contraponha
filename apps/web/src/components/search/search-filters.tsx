"use client"

import { SearchPeriod, SearchSort } from "@contraponha/types"
import { Filter } from "lucide-react"

import { Card, Checkbox, RadioGroup, RadioItem, useI18n, useViewer } from "@contraponha/web-ui"
import { useSearchState } from "@/components/search/use-search-params-state"

const PERIOD_KEYS = {
  [SearchPeriod.ANY]: "web.search.periodAny",
  [SearchPeriod.DAY]: "web.search.periodDay",
  [SearchPeriod.WEEK]: "web.search.periodWeek",
  [SearchPeriod.MONTH]: "web.search.periodMonth",
  [SearchPeriod.YEAR]: "web.search.periodYear",
} as const

export function SearchFilters(): React.JSX.Element {
  const { t } = useI18n()
  const viewer = useViewer()
  const { state, update } = useSearchState()

  const flags = [
    {
      name: "hasSource",
      label: t("web.search.hasSource"),
      checked: state.hasSource,
      isAvailable: true,
    },
    {
      name: "followingOnly",
      label: t("web.search.followingOnly"),
      checked: state.followingOnly,
      isAvailable: viewer !== null,
    },
    {
      name: "hasHighlights",
      label: t("web.search.hasHighlights"),
      checked: state.hasHighlights,
      isAvailable: true,
    },
  ] as const

  return (
    <>
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Filter aria-hidden className="size-5 text-muted" />
          {t("web.search.filters")}
        </h2>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold">{t("web.search.sortBy")}</legend>
          <RadioGroup
            value={state.sort}
            onValueChange={(sort) =>
              update({ sort: sort === SearchSort.RELEVANT ? undefined : sort })
            }
            className="flex flex-col gap-3"
          >
            <label className="flex items-start gap-3 text-sm">
              <RadioItem value={SearchSort.RELEVANT} />
              {t("web.search.sortRelevant")}
            </label>
            <label className="flex items-start gap-3 text-sm">
              <RadioItem value={SearchSort.RECENT} />
              {t("web.search.sortRecent")}
            </label>
          </RadioGroup>
        </fieldset>
        <hr className="h-px border-0 bg-line" />
        <div className="flex flex-col gap-3">
          {flags
            .filter(({ isAvailable }) => isAvailable)
            .map(({ name, label, checked }) => (
              <label key={name} className="flex items-start gap-3 text-sm">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) => update({ [name]: next === true })}
                />
                {label}
              </label>
            ))}
        </div>
        <hr className="h-px border-0 bg-line" />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">{t("web.search.period")}</span>
          <select
            value={state.period}
            onChange={(event) =>
              update({
                period: event.target.value === SearchPeriod.ANY ? undefined : event.target.value,
              })
            }
            className="h-11 rounded-md border border-line-strong bg-surface-raised px-3 text-[15px]"
          >
            {Object.values(SearchPeriod).map((period) => (
              <option key={period} value={period}>
                {t(PERIOD_KEYS[period])}
              </option>
            ))}
          </select>
        </label>
      </Card>
      <p className="text-[13px] text-subtle">{t("web.search.relevanceNote")}</p>
    </>
  )
}
