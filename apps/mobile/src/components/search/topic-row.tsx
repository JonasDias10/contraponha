import { topicLabel, topicMeta } from "@contraponha/client-core"
import type { TopicView } from "@contraponha/types"
import { router } from "expo-router"
import { Hash } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"

import { Card } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { paths } from "@/lib/paths"
import { space } from "@/lib/theme"

export interface TopicRowProps {
  topic: TopicView
}

export function TopicRow({ topic }: TopicRowProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const palette = usePalette()

  return (
    <Pressable accessibilityRole="link" onPress={() => router.push(paths.topic(topic.slug))}>
      <Card style={styles.card}>
        <View style={[styles.icon, { backgroundColor: palette.brandSoft }]}>
          <Hash size={24} color={palette.brand} />
        </View>
        <View style={styles.text}>
          <AppText variant="heading3">{topicLabel(topic)}</AppText>
          <AppText variant="small" tone="muted">
            {topicMeta({ topic, t, locale })}
          </AppText>
        </View>
      </Card>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: space.lg },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
})
