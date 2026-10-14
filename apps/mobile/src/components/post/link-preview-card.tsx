import type { LinkPreviewView } from "@contraponha/types"
import { Image } from "expo-image"
import { Pressable, StyleSheet, View } from "react-native"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { openExternalUrl } from "@/lib/open-url"
import { radius, space } from "@/lib/theme"

export interface LinkPreviewCardProps {
  preview: LinkPreviewView
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

const DEFAULT_IMAGE_RATIO = 1.91

export function LinkPreviewCard({ preview }: LinkPreviewCardProps): React.JSX.Element {
  const palette = usePalette()

  const ratio =
    preview.imageWidth && preview.imageHeight
      ? Math.max(preview.imageWidth / preview.imageHeight, 1)
      : DEFAULT_IMAGE_RATIO

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => openExternalUrl(preview.url)}
      style={({ pressed }) => [
        styles.card,
        { borderColor: palette.line },
        pressed && { backgroundColor: palette.surfaceSunken },
      ]}
    >
      {preview.imageUrl ? (
        <Image
          source={{ uri: preview.imageUrl }}
          contentFit="cover"
          style={[styles.image, { aspectRatio: ratio, backgroundColor: palette.surfaceSunken }]}
        />
      ) : null}
      <View style={styles.text}>
        <AppText variant="caption" tone="subtle">
          {preview.siteName ?? hostOf(preview.url)}
        </AppText>
        {preview.title ? <AppText variant="bodyStrong">{preview.title}</AppText> : null}
        {preview.description ? (
          <AppText variant="small" tone="muted" numberOfLines={2}>
            {preview.description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md + 2, overflow: "hidden" },
  image: { width: "100%" },
  text: { gap: 2, paddingHorizontal: space.lg, paddingVertical: space.md },
})
