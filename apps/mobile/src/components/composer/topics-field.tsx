import { queryKeys } from "@contraponha/client-core"
import { POST_TOPICS_MAX } from "@contraponha/config"
import { useQuery } from "@tanstack/react-query"
import { Plus, X } from "lucide-react-native"
import { useState } from "react"
import { StyleSheet, TextInput, View } from "react-native"

import { Tag } from "@/components/ui/chip"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { fonts, radius, space } from "@/lib/theme"

export interface TopicsFieldProps {
  value: string[]
  onChange: (topics: string[]) => void
}

// Curated interests are one tap away; anything else becomes a #hashtag topic.
export function TopicsField({ value, onChange }: TopicsFieldProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const [draft, setDraft] = useState("")

  const curated = useQuery({
    queryKey: queryKeys.topics.curated,
    queryFn: () => api.topics.listCurated(),
  })

  const isFull = value.length >= POST_TOPICS_MAX
  const lowered = new Set(value.map((topic) => topic.toLowerCase()))

  const add = (name: string): void => {
    const cleaned = name.replace(/^#+/, "").trim()

    if (!cleaned || isFull || lowered.has(cleaned.toLowerCase())) return

    onChange([...value, cleaned])

    setDraft("")
  }

  const suggestions = (curated.data?.topics ?? [])
    .filter(({ name }) => !lowered.has(name.toLowerCase()))
    .slice(0, 8)

  return (
    <View style={styles.group}>
      <AppText variant="smallStrong">{t("web.composer.topics")}</AppText>
      <View style={styles.wrap}>
        {value.map((topic) => (
          <Tag
            key={topic}
            label={topic}
            icon={X}
            isSelected
            accessibilityLabel={t("web.composer.removeTopic", { topic })}
            onPress={() => onChange(value.filter((item) => item !== topic))}
          />
        ))}
      </View>
      {isFull ? null : (
        <View style={[styles.input, { borderColor: palette.line }]}>
          <Plus size={16} color={palette.muted} />
          <TextInput
            value={draft}
            onChangeText={(text) => {
              if (text.endsWith(",")) {
                add(text.slice(0, -1))

                return
              }

              setDraft(text)
            }}
            onSubmitEditing={() => add(draft)}
            onBlur={() => add(draft)}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder={t("web.composer.topicPlaceholder")}
            placeholderTextColor={palette.subtle}
            aria-label={t("web.composer.addTopic")}
            style={[styles.textInput, { color: palette.ink }]}
          />
        </View>
      )}
      {isFull ? null : (
        <View style={styles.wrap}>
          {suggestions.map((topic) => (
            <Tag key={topic.slug} label={topic.name} icon={Plus} onPress={() => add(topic.name)} />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: space.md },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  textInput: { flex: 1, fontFamily: fonts.sans, fontSize: 15 },
})
