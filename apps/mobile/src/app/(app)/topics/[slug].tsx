import { queryKeys, topicLabel, topicMeta } from "@contraponha/client-core"
import type { FeedItem } from "@contraponha/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useLocalSearchParams } from "expo-router"
import { Hash } from "lucide-react-native"
import { StyleSheet, View } from "react-native"

import { InfiniteList } from "@/components/feed/infinite-list"
import { PostCard } from "@/components/post/post-card"
import { Button } from "@/components/ui/button"
import { Screen, ScreenHeader } from "@/components/ui/screen"
import { Card, EmptyState, ErrorView, LoadingView } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { space } from "@/lib/theme"

export default function TopicScreen(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const { t, locale } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: queryKeys.topics.one(slug),
    queryFn: () => api.topics.get(slug),
  })

  const follow = useMutation({
    mutationFn: (isFollowing: boolean) =>
      isFollowing ? api.topics.follow(slug) : api.topics.unfollow(slug),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.topics.one(slug) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.topics.followed }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.discover }),
      ]),
  })

  if (query.isPending || !query.data) {
    return (
      <Screen>
        <ScreenHeader />
        {query.isError ? <ErrorView onRetry={() => void query.refetch()} /> : <LoadingView />}
      </Screen>
    )
  }

  const topic = query.data
  const isFollowing = follow.isPending ? follow.variables : (topic.viewer?.isFollowing ?? false)

  return (
    <Screen>
      <ScreenHeader title={topicLabel(topic)} />
      <InfiniteList<FeedItem>
        queryKey={queryKeys.feed.topic(slug)}
        load={(cursor) => api.feed.topic({ slug, query: { cursor } })}
        renderItem={({ item }) => <PostCard post={item.post} reason={item.reason} />}
        keyOf={(item) => item.post.id}
        isSeparated
        header={
          <Card style={styles.header}>
            <View style={[styles.icon, { backgroundColor: palette.brandSoft }]}>
              <Hash size={24} color={palette.brand} />
            </View>
            <View style={styles.text}>
              <AppText variant="heading2" accessibilityRole="header">
                {topicLabel(topic)}
              </AppText>
              <AppText variant="small" tone="muted">
                {topicMeta({ topic, t, locale })}
              </AppText>
            </View>
            <Button
              size="sm"
              variant={isFollowing ? "secondary" : "primary"}
              accessibilityState={{ selected: isFollowing }}
              label={isFollowing ? t("web.topic.following") : t("web.topic.follow")}
              onPress={() => follow.mutate(!isFollowing)}
            />
          </Card>
        }
        empty={
          <EmptyState
            icon={<Hash size={32} color={palette.muted} />}
            title={t("web.topic.empty")}
          />
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.lg },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
})
