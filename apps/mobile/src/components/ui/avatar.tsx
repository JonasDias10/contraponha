import { StyleSheet, Text, View } from "react-native"

import { usePalette } from "@/hooks/use-palette"
import { fonts } from "@/lib/theme"

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

const SIZES: Record<AvatarSize, { box: number; font: number }> = {
  xs: { box: 24, font: 10 },
  sm: { box: 32, font: 12 },
  md: { box: 40, font: 15 },
  lg: { box: 56, font: 20 },
  xl: { box: 88, font: 32 },
}

function toneOf(seed: string): number {
  let hash = 0

  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0

  return hash % 6
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]?.[0] ?? ""
  const last = words.length > 1 ? (words.at(-1)?.[0] ?? "") : ""

  return `${first}${last}`.toUpperCase()
}

export interface AvatarProps {
  id: string
  name: string
  size?: AvatarSize
}

// Initials over one of six fixed tones derived from the id, so a person keeps their color.
export function Avatar({ id, name, size = "md" }: AvatarProps): React.JSX.Element {
  const palette = usePalette()
  const tone = palette.avatars[toneOf(id)] ?? palette.avatars[0]
  const { box, font } = SIZES[size]

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.base, { width: box, height: box, backgroundColor: tone?.bg }]}
    >
      <Text
        style={{
          color: tone?.ink,
          fontSize: font,
          fontFamily: size === "xl" ? fonts.serifSemibold : fonts.sansSemibold,
        }}
      >
        {initialsOf(name) || "·"}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: { borderRadius: 999, alignItems: "center", justifyContent: "center" },
})
