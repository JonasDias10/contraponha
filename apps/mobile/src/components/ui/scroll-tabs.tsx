import { Pressable, ScrollView, StyleSheet } from "react-native"

import type { SegmentedOption } from "@/components/ui/segmented"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { space } from "@/lib/theme"

export interface ScrollTabsProps<TValue extends string> {
  value: TValue
  options: SegmentedOption<TValue>[]
  onChange: (value: TValue) => void
}

// Underlined tabs that scroll sideways when the labels do not fit the screen.
export function ScrollTabs<TValue extends string>({
  value,
  options,
  onChange,
}: ScrollTabsProps<TValue>): React.JSX.Element {
  const palette = usePalette()

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      contentContainerStyle={styles.content}
      style={[styles.bar, { borderBottomColor: palette.line }]}
    >
      {options.map((option) => {
        const isActive = option.value === value

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(option.value)}
            style={[styles.item, isActive && { borderBottomColor: palette.ink }]}
          >
            <AppText variant={isActive ? "bodyStrong" : "body"} tone={isActive ? "ink" : "muted"}>
              {option.label}
            </AppText>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  bar: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  content: { gap: space.xl, paddingHorizontal: space.gutter },
  item: { paddingVertical: space.md, borderBottomWidth: 2, borderBottomColor: "transparent" },
})
