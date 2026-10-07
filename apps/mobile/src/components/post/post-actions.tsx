import type { ReactionsState } from "@contraponha/client-core/react"
import { useBookmarkMutation } from "@contraponha/client-core/react"
import type { PostView } from "@contraponha/types"
import { router } from "expo-router"
import { Bookmark, CircleCheck, MessageSquare, Share2 } from "lucide-react-native"
import { useState } from "react"
import { Pressable, Share, StyleSheet, View } from "react-native"

import { ReactionBar } from "@/components/post/reaction-bar"
import { BottomSheet } from "@/components/ui/action-sheet"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { paths, shareUrls } from "@/lib/paths"
import { REACTION_ICONS } from "@/lib/reaction-icons"
import { radius, space } from "@/lib/theme"

export interface PostActionsProps {
  post: PostView
  reactions: ReactionsState
  onContribute?: () => void
}

interface ActionProps {
  icon: React.ReactNode
  label?: string
  accessibilityLabel: string
  isActive?: boolean
  onPress: () => void
}

function Action({
  icon,
  label,
  accessibilityLabel,
  isActive = false,
  onPress,
}: ActionProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.action,
        pressed && { backgroundColor: palette.surfaceSunken },
      ]}
    >
      {icon}
      {label ? (
        <AppText variant={isActive ? "smallStrong" : "small"} tone={isActive ? "brand" : "muted"}>
          {label}
        </AppText>
      ) : null}
    </Pressable>
  )
}

export function PostActions({
  post,
  reactions,
  onContribute,
}: PostActionsProps): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()
  const bookmark = useBookmarkMutation()
  const [isPicking, setIsPicking] = useState(false)

  const isBookmarked = bookmark.isPending
    ? bookmark.variables.isSaving
    : (post.viewer?.isBookmarked ?? false)

  const [chosen] = reactions.reactions
  const ChosenIcon = chosen ? REACTION_ICONS[chosen] : CircleCheck

  const share = (): void => {
    const url = shareUrls.post(post.id)

    void Share.share({ message: post.title ? `${post.title}\n${url}` : url, url }).catch(
      () => undefined,
    )
  }

  return (
    <View style={styles.row}>
      <Action
        icon={<ChosenIcon size={20} color={chosen ? palette.brand : palette.muted} />}
        label={chosen ? t(`web.reactions.${chosen}`) : t("web.post.react")}
        accessibilityLabel={t("web.post.react")}
        isActive={Boolean(chosen)}
        onPress={() => setIsPicking(true)}
      />
      <Action
        icon={<MessageSquare size={20} color={palette.muted} />}
        label={t("web.post.contribute")}
        accessibilityLabel={t("web.post.contribute")}
        onPress={onContribute ?? (() => router.push(paths.post(post.id)))}
      />
      <View style={styles.spacer} />
      <Action
        icon={
          <Bookmark
            size={20}
            color={isBookmarked ? palette.brand : palette.muted}
            fill={isBookmarked ? palette.brand : "transparent"}
          />
        }
        accessibilityLabel={isBookmarked ? t("web.post.unsave") : t("web.post.save")}
        isActive={isBookmarked}
        onPress={() => bookmark.mutate({ postId: post.id, isSaving: !isBookmarked })}
      />
      <Action
        icon={<Share2 size={20} color={palette.muted} />}
        accessibilityLabel={t("web.post.share")}
        onPress={share}
      />
      <BottomSheet
        isOpen={isPicking}
        title={t("web.reactions.label")}
        onClose={() => setIsPicking(false)}
      >
        <View style={styles.picker}>
          <ReactionBar
            reactions={reactions.reactions}
            counts={reactions.counts}
            onToggle={reactions.toggle}
          />
          <AppText variant="caption" tone="subtle">
            {t("web.reactions.limit")}
          </AppText>
        </View>
      </BottomSheet>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginHorizontal: -10,
    marginBottom: -6,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    height: 40,
    minWidth: 44,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    justifyContent: "center",
  },
  spacer: { flex: 1 },
  picker: { gap: space.md, paddingHorizontal: space.md, paddingBottom: space.lg },
})
