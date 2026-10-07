import { REACTION_ORDER } from "@contraponha/client-core"
import { ReactionKind, type ReactionCounts } from "@contraponha/types"
import * as Haptics from "expo-haptics"
import { Pressable, StyleSheet, View } from "react-native"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { REACTION_ICONS } from "@/lib/reaction-icons"
import { radius, space } from "@/lib/theme"

export interface ReactionBarProps {
  reactions: ReactionKind[]
  counts: ReactionCounts
  onToggle: (kind: ReactionKind) => void
  isDisabled?: boolean
}

// Labels are always written out; "needs a source" uses the warning tone because it is a
// constructive request, not a dislike.
export function ReactionBar({
  reactions,
  counts,
  onToggle,
  isDisabled = false,
}: ReactionBarProps): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()

  return (
    <View accessibilityLabel={t("web.reactions.label")} style={styles.bar}>
      {REACTION_ORDER.map((kind) => {
        const Icon = REACTION_ICONS[kind]
        const isOn = reactions.includes(kind)
        const isSource = kind === ReactionKind.NEEDS_SOURCE
        const onColor = isSource ? palette.warning : palette.brand

        return (
          <Pressable
            key={kind}
            accessibilityRole="button"
            accessibilityState={{ selected: isOn, disabled: isDisabled }}
            accessibilityLabel={`${t(`web.reactions.${kind}`)}, ${counts[kind]}`}
            disabled={isDisabled}
            onPress={() => {
              void Haptics.selectionAsync()

              onToggle(kind)
            }}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: isOn
                  ? isSource
                    ? palette.warningSoft
                    : palette.brandSoft
                  : palette.surfaceRaised,
                borderColor: isOn ? "transparent" : palette.line,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <Icon size={18} color={isOn ? onColor : isSource ? palette.warning : palette.muted} />
            <AppText
              variant={isOn ? "smallStrong" : "small"}
              style={{ color: isOn ? onColor : palette.ink }}
            >
              {t(`web.reactions.${kind}`)}
            </AppText>
            <AppText variant="small" style={{ color: isOn ? onColor : palette.subtle }}>
              {counts[kind]}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}

export interface ReactionSummaryProps {
  counts: ReactionCounts
  commentCount?: number
}

// Only the two most given reactions, in words; numbers stay quiet and views never show.
export function ReactionSummary({
  counts,
  commentCount,
}: ReactionSummaryProps): React.JSX.Element | null {
  const { t } = useI18n()

  const top = REACTION_ORDER.filter((kind) => counts[kind] > 0)
    .toSorted((a, b) => counts[b] - counts[a])
    .slice(0, 2)

  const parts = [
    ...top.map((kind) => t(`web.reactions.summary_${kind}`, { count: counts[kind] })),
    ...(commentCount ? [t("web.post.summaryContributions", { count: commentCount })] : []),
  ]

  if (parts.length === 0) return null

  return (
    <AppText variant="small" tone="muted">
      {parts.join(" · ")}
    </AppText>
  )
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 40,
    paddingLeft: 12,
    paddingRight: 14,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
