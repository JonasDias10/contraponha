import type { QuotedPostView } from "@contraponha/types"
import { router } from "expo-router"
import { Pressable, StyleSheet, View } from "react-native"

import { VerifiedBadge } from "@/components/profile/verified-badge"
import { Avatar } from "@/components/ui/avatar"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { paths } from "@/lib/paths"
import { radius, space } from "@/lib/theme"

export interface QuotedPostCardProps {
  quoted: QuotedPostView
}

// The post a quote refers to, compact and tappable; a removed original leaves only a note.
export function QuotedPostCard({ quoted }: QuotedPostCardProps): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()
  const { author } = quoted

  if (quoted.isDeleted || !author) {
    return (
      <View
        style={[styles.card, { borderColor: palette.line, backgroundColor: palette.surfaceSunken }]}
      >
        <AppText variant="small" tone="muted">
          {t("web.repost.removed")}
        </AppText>
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push(paths.post(quoted.id))}
      style={({ pressed }) => [
        styles.card,
        { borderColor: palette.line },
        pressed && { backgroundColor: palette.surfaceSunken },
      ]}
    >
      <View style={styles.author}>
        <Avatar id={author.id} name={author.displayName} src={author.avatarUrl} size="xs" />
        <AppText variant="smallStrong" numberOfLines={1}>
          {author.displayName}
        </AppText>
        <VerifiedBadge verification={author.verification} size={14} />
        <AppText variant="small" tone="subtle" numberOfLines={1} style={styles.flex}>
          @{author.handle}
        </AppText>
      </View>
      {quoted.title ? <AppText variant="bodyStrong">{quoted.title}</AppText> : null}
      {quoted.excerpt ? (
        <AppText variant="small" tone="muted" numberOfLines={4}>
          {quoted.excerpt}
        </AppText>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    gap: space.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: space.md,
  },
  author: { flexDirection: "row", alignItems: "center", gap: space.sm },
  flex: { flex: 1 },
})
