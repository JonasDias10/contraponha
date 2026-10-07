"use client"

import { useTopicInterests } from "@contraponha/client-core/react"

import { useI18n } from "@/components/providers/i18n-provider"
import { SettingsSection } from "@/components/settings/settings-section"
import { InterestsPicker } from "@/components/topics/interests-picker"

export function InterestsSettings(): React.JSX.Element {
  const { t } = useI18n()
  const { curated, hashtags, selected, toggle: onToggle } = useTopicInterests()

  return (
    <SettingsSection
      title={t("web.settings.interestsTitle")}
      lead={t("web.settings.interestsLead")}
    >
      <InterestsPicker topics={curated} selected={selected} onToggle={onToggle} />
      {hashtags.length > 0 ? (
        <InterestsPicker topics={hashtags} selected={selected} onToggle={onToggle} />
      ) : null}
    </SettingsSection>
  )
}
