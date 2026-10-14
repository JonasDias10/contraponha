import type { PublicProfile } from "@contraponha/types"
import { router } from "expo-router"
import { Pressable, StyleSheet, View } from "react-native"

import { RelativeTime } from "@/components/post/relative-time"
import { Avatar, type AvatarSize } from "@/components/ui/avatar"
import { personLabel, VerifiedBadge } from "@/components/profile/verified-badge"
import { Chip } from "@/components/ui/chip"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { paths } from "@/lib/paths"
import { space } from "@/lib/theme"

export interface AuthorLineProps {
  author: PublicProfile | null
  createdAt: string
  size?: AvatarSize
  isPostAuthor?: boolean
  extra?: React.ReactNode
  trailing?: React.ReactNode
}

export function AuthorLine({
  author,
  createdAt,
  size = "md",
  isPostAuthor = false,
  extra,
  trailing,
}: AuthorLineProps): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const isDeleted = !author || author.isDeleted

  const openProfile = (): void => {
    if (author && !author.isDeleted) router.push(paths.profile(author.handle))
  }

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={
          isDeleted ? t("web.common.deletedAccount") : personLabel({ person: author, t })
        }
        disabled={isDeleted}
        onPress={openProfile}
        style={styles.main}
      >
        {isDeleted ? (
          <View style={[styles.deleted, { backgroundColor: palette.surfaceSunken }]} />
        ) : (
          <Avatar id={author.id} name={author.displayName} src={author.avatarUrl} size={size} />
        )}
        <View style={styles.text}>
          <View style={styles.nameRow}>
            <AppText
              variant="bodyStrong"
              tone={isDeleted ? "subtle" : "ink"}
              numberOfLines={1}
              style={styles.name}
            >
              {isDeleted ? t("web.common.deletedAccount") : author.displayName}
            </AppText>
            {isDeleted ? null : <VerifiedBadge verification={author.verification} />}
            {isPostAuthor ? <Chip label={t("web.common.author")} /> : null}
          </View>
          <View style={styles.meta}>
            {!isDeleted ? (
              <AppText variant="caption" tone="subtle" numberOfLines={1} style={styles.shrink}>
                @{author.handle}
                {author.headline ? ` · ${author.headline}` : ""}
              </AppText>
            ) : null}
            <AppText variant="caption" tone="subtle">
              {" · "}
            </AppText>
            <RelativeTime value={createdAt} variant="caption" tone="subtle" />
            {extra}
          </View>
        </View>
      </Pressable>
      {trailing}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md },
  deleted: { width: 40, height: 40, borderRadius: 20 },
  text: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { flexShrink: 1 },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "nowrap" },
  shrink: { flexShrink: 1 },
})
