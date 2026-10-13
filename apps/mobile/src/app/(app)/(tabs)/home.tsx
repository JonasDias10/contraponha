import { queryKeys } from "@contraponha/client-core"
import { usePendingFeedPosts } from "@contraponha/client-core/react"
import type { FeedItem } from "@contraponha/types"
import { router } from "expo-router"
import { Bookmark, Compass, Sunrise } from "lucide-react-native"
import { useState } from "react"
import { StyleSheet, View, type ListRenderItem } from "react-native"

import { InfiniteList } from "@/components/feed/infinite-list"
import { NewItemsPill } from "@/components/feed/new-items-pill"
import { PostCard } from "@/components/post/post-card"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/ui/screen"
import { Segmented } from "@/components/ui/segmented"
import { Card, EmptyState } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { space } from "@/lib/theme"

type HomeTab = "following" | "discover"

export default function HomeScreen(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const [tab, setTab] = useState<HomeTab>("following")
  const pending = usePendingFeedPosts()

  const header = (
    <View style={styles.header}>
      <AppText variant="heading1" accessibilityRole="header">
        {t("web.feed.title")}
      </AppText>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "following", label: t("web.feed.following") },
          { value: "discover", label: t("web.feed.discover") },
        ]}
      />
      <AppText variant="caption" tone="subtle">
        {tab === "following" ? t("web.feed.chronological") : t("web.feed.discoverNote")}
      </AppText>
    </View>
  )

  const renderItem: ListRenderItem<FeedItem> = ({ item }) => (
    <PostCard post={item.post} reason={item.reason} repostedBy={item.repostedBy} />
  )

  return (
    <Screen>
      {tab === "following" && pending.count > 0 ? (
        <NewItemsPill
          label={t("web.realtime.newPosts", { count: pending.count })}
          onReveal={() => void pending.reveal()}
        />
      ) : null}
      {tab === "following" ? (
        <InfiniteList
          key="following"
          queryKey={queryKeys.feed.following}
          load={(cursor) => api.feed.following({ cursor })}
          renderItem={renderItem}
          keyOf={(item) => item.post.id}
          header={header}
          isSeparated
          empty={
            <Card>
              <EmptyState
                icon={<Compass size={32} color={palette.brand} />}
                title={t("web.feed.emptyFollowingTitle")}
                description={t("web.feed.emptyFollowingBody")}
                action={
                  <Button
                    variant="secondary"
                    label={t("web.feed.discover")}
                    onPress={() => setTab("discover")}
                  />
                }
              />
            </Card>
          }
          end={
            <Card style={styles.end}>
              <EmptyState
                icon={<Sunrise size={32} color={palette.brand} />}
                title={t("web.feed.caughtUpTitle")}
                description={t("web.feed.caughtUpBody")}
                action={
                  <View style={styles.endActions}>
                    <Button
                      variant="secondary"
                      label={t("web.feed.exploreDiscussions")}
                      onPress={() => setTab("discover")}
                    />
                    <Button
                      icon={Bookmark}
                      label={t("web.nav.saved")}
                      onPress={() => router.push("/saved")}
                    />
                  </View>
                }
              />
            </Card>
          }
        />
      ) : (
        <InfiniteList
          key="discover"
          queryKey={queryKeys.feed.discover}
          load={(cursor) => api.feed.discover({ cursor })}
          renderItem={renderItem}
          keyOf={(item) => item.post.id}
          header={header}
          isSeparated
          empty={
            <Card>
              <EmptyState
                icon={<Compass size={32} color={palette.muted} />}
                title={t("web.feed.emptyDiscoverTitle")}
                description={t("web.feed.emptyDiscoverBody")}
              />
            </Card>
          }
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: space.md, marginBottom: space.lg },
  end: { marginTop: space.lg },
  endActions: { gap: space.sm, alignItems: "center" },
})
