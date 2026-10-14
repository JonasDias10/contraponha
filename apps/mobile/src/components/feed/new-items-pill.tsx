import { ArrowUp } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { radius, space } from "@/lib/theme"

export interface NewItemsPillProps {
  label: string
  onReveal: () => void
}

// Floats over the list when new items arrived; nothing moves until the reader taps it.
export function NewItemsPill({ label, onReveal }: NewItemsPillProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        onPress={onReveal}
        style={[styles.pill, { backgroundColor: palette.brand }]}
      >
        <ArrowUp size={16} color={palette.onBrand} />
        <AppText variant="smallStrong" style={{ color: palette.onBrand }}>
          {label}
        </AppText>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: space.md,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
  },
})
