import { formatDateTime, queryKeys, toVersions } from "@contraponha/client-core"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"

import { Markdown } from "@/components/post/markdown"
import { Screen, ScreenHeader, ScrollContent } from "@/components/ui/screen"
import { ErrorView, LoadingView } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { space } from "@/lib/theme"

export default function HistoryScreen(): React.JSX.Element {
  const { postId } = useLocalSearchParams<{ postId: string }>()
  const { t, locale } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const [openVersion, setOpenVersion] = useState<number | null>(null)

  const post = useQuery({ queryKey: queryKeys.post(postId), queryFn: () => api.posts.get(postId) })

  const revisions = useQuery({
    queryKey: queryKeys.postRevisions(postId),
    queryFn: () => api.posts.listRevisions(postId),
  })

  if (post.isPending || revisions.isPending) {
    return (
      <Screen>
        <ScreenHeader title={t("web.history.title")} />
        <LoadingView />
      </Screen>
    )
  }

  if (!post.data || !revisions.data) {
    return (
      <Screen>
        <ScreenHeader title={t("web.history.title")} />
        <ErrorView onRetry={() => void Promise.all([post.refetch(), revisions.refetch()])} />
      </Screen>
    )
  }

  const versions = toVersions({ post: post.data, revisions: revisions.data.revisions })

  return (
    <Screen>
      <ScreenHeader title={t("web.history.title")} />
      <ScrollContent>
        <AppText tone="muted">{t("web.history.lead", { count: post.data.revisionCount })}</AppText>
        {versions.map((version) => (
          <View key={version.number} style={styles.version}>
            <View
              style={[
                styles.marker,
                version.isCurrent
                  ? { backgroundColor: palette.brand, borderColor: palette.brand }
                  : { backgroundColor: palette.surfaceRaised, borderColor: palette.lineStrong },
              ]}
            />
            <View style={styles.body}>
              <AppText variant="smallStrong">
                {version.isCurrent
                  ? t("web.history.current", { number: version.number })
                  : version.number === 1
                    ? t("web.history.original")
                    : t("web.history.version", { number: version.number })}
              </AppText>
              <AppText variant="caption" tone="subtle">
                {formatDateTime({ value: version.createdAt, locale })}
              </AppText>
              {version.reason ? (
                <AppText variant="caption" tone="subtle">
                  {t("web.history.reason", { reason: version.reason })}
                </AppText>
              ) : null}
              {version.isCurrent ? null : openVersion === version.number ? (
                <View style={styles.content}>
                  {version.title ? <AppText variant="bodyStrong">{version.title}</AppText> : null}
                  <Markdown text={version.body} fontSize={15} />
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setOpenVersion(version.number)}
                >
                  <AppText variant="smallStrong" tone="brand">
                    {t("web.history.open")}
                  </AppText>
                </Pressable>
              )}
            </View>
          </View>
        ))}
      </ScrollContent>
    </Screen>
  )
}

const styles = StyleSheet.create({
  version: { flexDirection: "row", gap: space.md },
  marker: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, marginTop: 4 },
  body: { flex: 1, gap: space.xs },
  content: { gap: space.sm, marginTop: space.sm },
})
