import { Pressable, StyleSheet, View } from "react-native"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { radius } from "@/lib/theme"

export interface SegmentedOption<TValue extends string> {
  value: TValue
  label: string
}

export interface SegmentedProps<TValue extends string> {
  value: TValue
  options: SegmentedOption<TValue>[]
  onChange: (value: TValue) => void
}

export function Segmented<TValue extends string>({
  value,
  options,
  onChange,
}: SegmentedProps<TValue>): React.JSX.Element {
  const palette = usePalette()

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.list, { backgroundColor: palette.surfaceSunken }]}
    >
      {options.map((option) => {
        const isActive = option.value === value

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(option.value)}
            style={[styles.item, isActive && { backgroundColor: palette.surfaceRaised }]}
          >
            <AppText
              variant={isActive ? "smallStrong" : "small"}
              tone={isActive ? "ink" : "muted"}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}

export type UnderlineTabsProps<TValue extends string> = SegmentedProps<TValue>

export function UnderlineTabs<TValue extends string>({
  value,
  options,
  onChange,
}: UnderlineTabsProps<TValue>): React.JSX.Element {
  const palette = usePalette()

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.underline, { borderBottomColor: palette.line }]}
    >
      {options.map((option) => {
        const isActive = option.value === value

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(option.value)}
            style={[styles.underlineItem, isActive && { borderBottomColor: palette.ink }]}
          >
            <AppText variant={isActive ? "bodyStrong" : "body"} tone={isActive ? "ink" : "muted"}>
              {option.label}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { flexDirection: "row", padding: 4, borderRadius: radius.md, gap: 4 },
  item: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  underline: { flexDirection: "row", gap: 20, borderBottomWidth: StyleSheet.hairlineWidth },
  underlineItem: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -StyleSheet.hairlineWidth,
  },
})
