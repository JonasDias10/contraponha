import type { MediaView } from "@contraponha/types"
import { Image } from "expo-image"
import { StyleSheet, View } from "react-native"

import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { radius } from "@/lib/theme"

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
          source={{ uri: item.url }}
          accessibilityLabel={`${t("web.composer.image")} ${index + 1}`}
          contentFit="cover"
          transition={150}
          style={[
            isSingle ? styles.singleImage : styles.tile,
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
  singleImage: { width: "100%", aspectRatio: 4 / 3 },
  tile: { width: "48.5%", aspectRatio: 1 },
})
