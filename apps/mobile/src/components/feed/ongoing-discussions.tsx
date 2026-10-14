import { queryKeys } from "@contraponha/client-core"
import type { DiscussionSummary } from "@contraponha/types"
import { useQuery } from "@tanstack/react-query"
import { router } from "expo-router"
import { Pressable, ScrollView, StyleSheet, View } from "react-native"

import { Card } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { paths } from "@/lib/paths"
import { space } from "@/lib/theme"

const CARD_WIDTH = 240

interface DiscussionCardProps {
  discussion: DiscussionSummary
}

function DiscussionCard({ discussion }: DiscussionCardProps): React.JSX.Element {
  const { t } = useI18n()

  const meta = [
    t("web.post.summaryContributions", { count: discussion.commentCount }),
    t("web.feed.ongoingHighlighted", { count: discussion.highlightedCommentCount }),
  ].join(" · ")

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${discussion.title}. ${meta}`}
      onPress={() => router.push(paths.post(discussion.postId))}
    >
      <Card style={styles.card}>
        <AppText variant="bodyStrong" numberOfLines={3}>
          {discussion.title}
        </AppText>
        <AppText variant="caption" tone="subtle">
          {meta}
        </AppText>
      </Card>
    </Pressable>
  )
}

export function OngoingDiscussions(): React.JSX.Element | null {
  const { t } = useI18n()
  const api = useApi()

  const { data } = useQuery({
    queryKey: queryKeys.feed.discussions,
    queryFn: () => api.feed.discussions(),
  })

  if (!data || data.discussions.length === 0) return null

  return (
    <View style={styles.section}>
      <AppText variant="overline" tone="muted" accessibilityRole="header">
        {t("web.feed.ongoingTitle")}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {data.discussions.map((discussion) => (
          <DiscussionCard key={discussion.postId} discussion={discussion} />
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  row: { gap: space.md },
  card: { width: CARD_WIDTH, gap: space.xs, flexGrow: 1 },
})
