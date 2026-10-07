import type { TopicView } from "@contraponha/types"
import { Check } from "lucide-react-native"
import { StyleSheet, View } from "react-native"

import { Tag } from "@/components/ui/chip"
import { useI18n } from "@/providers/i18n-provider"
import { space } from "@/lib/theme"

export interface InterestsPickerProps {
  topics: TopicView[]
  selected: Set<string>
  onToggle: (slug: string) => void
}

export function InterestsPicker({
  topics,
  selected,
  onToggle,
}: InterestsPickerProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <View accessibilityLabel={t("web.settings.interests")} style={styles.list}>
      {topics.map((topic) => {
        const isOn = selected.has(topic.slug)

        return (
          <Tag
            key={topic.slug}
            label={topic.name}
            icon={isOn ? Check : undefined}
            isSelected={isOn}
            onPress={() => onToggle(topic.slug)}
          />
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
})
