import type { MediaView } from "@contraponha/types"
import { Image, type ImageSource } from "expo-image"
import { StyleSheet, View } from "react-native"

import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { radius } from "@/lib/theme"

const DEFAULT_ASPECT_RATIO = 4 / 3
const MIN_ASPECT_RATIO = 3 / 4

// expo-image picks the variant that fits the view, so the feed loads the small WebP.
function sourcesOf(item: MediaView): ImageSource[] {
  if (item.variants.length === 0) return [{ uri: item.url }]

  return item.variants.map(({ url, width, height }) => ({ uri: url, width, height }))
}

// Tall photos are capped so a single image never fills the whole screen.
function aspectRatioOf(item: MediaView): number {
  if (!item.width || !item.height) return DEFAULT_ASPECT_RATIO

  return Math.max(item.width / item.height, MIN_ASPECT_RATIO)
}

export interface MediaGridProps {
  media: MediaView[]
}

export function MediaGrid({ media }: MediaGridProps): React.JSX.Element | null {
  const palette = usePalette()
  const { t } = useI18n()

  if (media.length === 0) return null

  const isSingle = media.length === 1

  return (
    <View style={[styles.grid, isSingle && styles.single]}>
      {media.map((item, index) => (
        <Image
          key={item.id}
          source={sourcesOf(item)}
          accessibilityLabel={`${t("web.composer.image")} ${index + 1}`}
          contentFit="cover"
          transition={150}
          style={[
            isSingle ? [styles.singleImage, { aspectRatio: aspectRatioOf(item) }] : styles.tile,
            { backgroundColor: palette.surfaceSunken },
          ]}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    borderRadius: radius.md + 2,
    overflow: "hidden",
  },
  single: { flexDirection: "column" },
  singleImage: { width: "100%" },
  tile: { width: "48.5%", aspectRatio: 1 },
})
