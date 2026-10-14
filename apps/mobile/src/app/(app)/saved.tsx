import { queryKeys } from "@contraponha/client-core"
import { useBookmarkCount } from "@contraponha/client-core/react"
import type { PostView } from "@contraponha/types"
import { router } from "expo-router"
import { Inbox } from "lucide-react-native"
import { StyleSheet, View } from "react-native"

import { InfiniteList } from "@/components/feed/infinite-list"
import { PostCard } from "@/components/post/post-card"
import { Button } from "@/components/ui/button"
import { Screen, ScreenHeader } from "@/components/ui/screen"
import { Card, EmptyState } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { space } from "@/lib/theme"

export default function SavedScreen(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const count = useBookmarkCount()

  return (
    <Screen>
      <ScreenHeader title={t("web.saved.title")} />
      <InfiniteList<PostView>
        queryKey={queryKeys.bookmarks}
        load={(cursor) => api.posts.listBookmarks({ cursor })}
        renderItem={({ item }) => <PostCard post={item} />}
        keyOf={(item) => item.id}
        isSeparated
        header={
          <View style={styles.header}>
            {count ? (
              <AppText variant="smallStrong">{t("web.saved.count", { count })}</AppText>
            ) : null}
            <AppText variant="caption" tone="subtle">
              {t("web.saved.lead")}
            </AppText>
          </View>
        }
        empty={
          <Card>
            <EmptyState
              icon={<Inbox size={32} color={palette.muted} />}
              title={t("web.saved.emptyTitle")}
              description={t("web.saved.emptyBody")}
              action={
                <Button
                  variant="secondary"
                  isBlock
                  label={t("web.saved.explore")}
                  onPress={() => router.navigate("/home")}
                />
              }
            />
          </Card>
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { marginBottom: space.lg, gap: space.xs },
})
