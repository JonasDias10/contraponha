import type { LucideIcon } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { radius } from "@/lib/theme"

export type ChipTone = "neutral" | "brand" | "accent" | "success" | "warning" | "danger"

export interface ChipProps {
  label: string
  tone?: ChipTone
}

export function Chip({ label, tone = "neutral" }: ChipProps): React.JSX.Element {
  const palette = usePalette()

  const colors = {
    neutral: { background: palette.surfaceSunken, text: palette.muted },
    brand: { background: palette.brandSoft, text: palette.brand },
    accent: { background: palette.accentSoft, text: palette.accent },
    success: { background: palette.successSoft, text: palette.success },
    warning: { background: palette.warningSoft, text: palette.warning },
    danger: { background: palette.dangerSoft, text: palette.danger },
  }[tone]

  return (
    <View style={[styles.chip, { backgroundColor: colors.background }]}>
      <AppText variant="caption" style={[styles.chipText, { color: colors.text }]}>
        {label}
      </AppText>
    </View>
  )
}

export interface TagProps {
  label: string
  icon?: LucideIcon
  isSelected?: boolean
  onPress?: () => void
  accessibilityLabel?: string
}

export function Tag({
  label,
  icon: Icon,
  isSelected = false,
  onPress,
  accessibilityLabel,
}: TagProps): React.JSX.Element {
  const palette = usePalette()
  const color = isSelected ? palette.brand : palette.ink

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: isSelected }}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tag,
        {
          backgroundColor: isSelected ? palette.brandSoft : palette.surfaceSunken,
          borderColor: isSelected ? "transparent" : palette.line,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {Icon ? <Icon size={15} color={isSelected ? palette.brand : palette.muted} /> : null}
      <AppText variant={isSelected ? "smallStrong" : "small"} style={{ color }}>
        {label}
      </AppText>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  chipText: { fontWeight: "600" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
})
