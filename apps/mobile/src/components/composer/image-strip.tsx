import { Image } from "expo-image"
import { X } from "lucide-react-native"
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native"

import type { UploadedImage } from "@/hooks/use-image-uploads"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { radius, space } from "@/lib/theme"

export interface ImageStripProps {
  images: UploadedImage[]
  isUploading: boolean
  onRemove: (mediaId: string) => void
}

export function ImageStrip({
  images,
  isUploading,
  onRemove,
}: ImageStripProps): React.JSX.Element | null {
  const { t } = useI18n()
  const palette = usePalette()

  if (images.length === 0 && !isUploading) return null

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      accessibilityLabel={t("web.composer.imagesLabel")}
    >
      {images.map((image, index) => (
        <View key={image.mediaId}>
          <Image
            source={{ uri: image.previewUrl }}
            accessibilityLabel={t("web.composer.imageAlt", { number: index + 1 })}
            contentFit="cover"
            style={[styles.image, { backgroundColor: palette.surfaceSunken }]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("web.composer.removeImage")}
            onPress={() => onRemove(image.mediaId)}
            style={[styles.remove, { backgroundColor: palette.inverse }]}
          >
            <X size={14} color={palette.onInverse} />
          </Pressable>
        </View>
      ))}
      {isUploading ? (
        <View
          accessibilityLabel={t("web.composer.uploading")}
          style={[styles.image, styles.loading, { backgroundColor: palette.surfaceSunken }]}
        >
          <ActivityIndicator color={palette.muted} />
        </View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  strip: { gap: space.sm },
  image: { width: 96, height: 96, borderRadius: radius.md },
  loading: { alignItems: "center", justifyContent: "center" },
  remove: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
})
