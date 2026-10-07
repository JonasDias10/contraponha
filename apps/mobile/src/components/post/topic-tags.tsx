import { topicLabel } from "@contraponha/client-core"
import type { TopicSummary } from "@contraponha/types"
import { router } from "expo-router"
import { StyleSheet, View } from "react-native"

import { Tag } from "@/components/ui/chip"
import { paths } from "@/lib/paths"

export interface TopicTagsProps {
  topics: TopicSummary[]
}

export function TopicTags({ topics }: TopicTagsProps): React.JSX.Element | null {
  if (topics.length === 0) return null

  return (
    <View style={styles.list}>
      {topics.map((topic) => (
        <Tag
          key={topic.slug}
          label={topicLabel(topic)}
          onPress={() => router.push(paths.topic(topic.slug))}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
})
