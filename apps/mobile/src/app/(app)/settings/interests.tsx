import { useTopicInterests } from "@contraponha/client-core/react"

import { InterestsPicker } from "@/components/settings/interests-picker"
import { SettingsScreen } from "@/components/settings/settings-screen"
import { SettingsSection } from "@/components/settings/settings-section"
import { useI18n } from "@/providers/i18n-provider"

export default function InterestsSettingsScreen(): React.JSX.Element {
  const { t } = useI18n()
  const { curated, hashtags, selected, toggle } = useTopicInterests()

  return (
    <SettingsScreen title={t("web.settings.interests")}>
      <SettingsSection
        title={t("web.settings.interestsTitle")}
        lead={t("web.settings.interestsLead")}
      >
        <InterestsPicker topics={curated} selected={selected} onToggle={toggle} />
        {hashtags.length > 0 ? (
          <InterestsPicker topics={hashtags} selected={selected} onToggle={toggle} />
        ) : null}
      </SettingsSection>
    </SettingsScreen>
  )
}
