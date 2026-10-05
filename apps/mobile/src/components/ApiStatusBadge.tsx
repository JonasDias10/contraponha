import { StyleSheet, Text, View } from "react-native"

import type { ApiReadiness } from "@/hooks/use-api-readiness"
import { usePalette } from "@/lib/theme"

interface ApiStatusBadgeProps {
  readiness: ApiReadiness
  label: string
}

export function ApiStatusBadge({ readiness, label }: ApiStatusBadgeProps): React.JSX.Element {
  const palette = usePalette()
  const dotColor = {
    checking: palette.muted,
    online: palette.success,
    offline: palette.danger,
  }[readiness]

  return (
    <View accessibilityRole="text" style={[styles.badge, { borderColor: palette.line }]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.label, { color: palette.muted }]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 14,
  },
})
