import { REACTION_ORDER } from "@contraponha/client-core"
import { useReactions } from "@contraponha/client-core/react"
import type { CommentView } from "@contraponha/types"
import { CircleCheck } from "lucide-react-native"
import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"

import { ReactionBar } from "@/components/post/reaction-bar"
import { BottomSheet } from "@/components/ui/action-sheet"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { REACTION_ICONS } from "@/lib/reaction-icons"
import { radius, space } from "@/lib/theme"

export interface CommentReactionsProps {
  comment: CommentView
}

export function CommentReactions({ comment }: CommentReactionsProps): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const [isPicking, setIsPicking] = useState(false)

  const reactions = useReactions({
    targetType: "comment",
    targetId: comment.id,
    postId: comment.postId,
    initialReactions: comment.viewer?.reactions ?? [],
    initialCounts: comment.reactionCounts,
  })

  const visible = REACTION_ORDER.filter(
    (kind) => reactions.counts[kind] > 0 || reactions.reactions.includes(kind),
  )

  return (
    <>
      {visible.map((kind) => {
        const Icon = REACTION_ICONS[kind]
        const isOn = reactions.reactions.includes(kind)
        const color = isOn ? palette.brand : palette.muted

        return (
          <Pressable
            key={kind}
            accessibilityRole="button"
            accessibilityState={{ selected: isOn }}
            onPress={() => reactions.toggle(kind)}
            style={({ pressed }) => [
              styles.action,
              pressed && { backgroundColor: palette.surfaceSunken },
            ]}
          >
            <Icon size={16} color={color} />
            <AppText variant={isOn ? "smallStrong" : "small"} style={{ color }}>
              {t(`web.reactions.${kind}`)} · {reactions.counts[kind]}
            </AppText>
          </Pressable>
        )
      })}
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsPicking(true)}
        style={({ pressed }) => [
          styles.action,
          pressed && { backgroundColor: palette.surfaceSunken },
        ]}
      >
        <CircleCheck size={16} color={palette.muted} />
        <AppText variant="small" tone="muted">
          {t("web.post.react")}
        </AppText>
      </Pressable>
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
    </>
  )
}

export const commentActionStyle = StyleSheet.create({
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: radius.md,
  },
}).action

const styles = StyleSheet.create({
  action: commentActionStyle,
  picker: { gap: space.md, paddingHorizontal: space.md, paddingBottom: space.lg },
})
