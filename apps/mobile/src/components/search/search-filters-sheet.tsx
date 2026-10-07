import type { ContentSearchKey } from "@contraponha/client-core"
import { SearchPeriod, SearchSort } from "@contraponha/types"

import { Button } from "@/components/ui/button"
import { Checkbox, RadioGroup } from "@/components/ui/choice"
import { Sheet } from "@/components/ui/sheet"
import { Divider } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { useI18n } from "@/providers/i18n-provider"

const PERIOD_KEYS = {
  [SearchPeriod.ANY]: "web.search.periodAny",
  [SearchPeriod.DAY]: "web.search.periodDay",
  [SearchPeriod.WEEK]: "web.search.periodWeek",
  [SearchPeriod.MONTH]: "web.search.periodMonth",
  [SearchPeriod.YEAR]: "web.search.periodYear",
} as const

export type SearchFilters = Omit<ContentSearchKey, "q">

export interface SearchFiltersSheetProps {
  isOpen: boolean
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  onClose: () => void
}

export function SearchFiltersSheet({
  isOpen,
  filters,
  onChange,
  onClose,
}: SearchFiltersSheetProps): React.JSX.Element {
  const { t } = useI18n()

  const flags = [
    { name: "hasSource", label: t("web.search.hasSource") },
    { name: "followingOnly", label: t("web.search.followingOnly") },
    { name: "hasHighlights", label: t("web.search.hasHighlights") },
  ] as const

  return (
    <Sheet
      isOpen={isOpen}
      title={t("web.search.filters")}
      onClose={onClose}
      footer={<Button label={t("web.common.confirm")} onPress={onClose} />}
    >
      <AppText variant="smallStrong">{t("web.search.sortBy")}</AppText>
      <RadioGroup
        value={filters.sort}
        onChange={(sort) => onChange({ ...filters, sort })}
        options={[
          { value: SearchSort.RELEVANT, label: t("web.search.sortRelevant") },
          { value: SearchSort.RECENT, label: t("web.search.sortRecent") },
        ]}
      />
      <Divider />
      {flags.map(({ name, label }) => (
        <Checkbox
          key={name}
          isChecked={filters[name]}
          onChange={(isChecked) => onChange({ ...filters, [name]: isChecked })}
        >
          <AppText>{label}</AppText>
        </Checkbox>
      ))}
      <Divider />
      <AppText variant="smallStrong">{t("web.search.period")}</AppText>
      <RadioGroup
        value={filters.period}
        onChange={(period) => onChange({ ...filters, period })}
        options={Object.values(SearchPeriod).map((period) => ({
          value: period,
          label: t(PERIOD_KEYS[period]),
        }))}
      />
      <AppText variant="caption" tone="subtle">
        {t("web.search.relevanceNote")}
      </AppText>
    </Sheet>
  )
}
