import type { ContentSource } from "@contraponha/types"
import { BookText, ChevronRight } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { openExternalUrl } from "@/lib/open-url"
import { radius, space } from "@/lib/theme"

export interface SourceCardProps {
  source: ContentSource
  action?: React.ReactNode
}

// A cited source is a first-class block, not a link lost in the text.
export function SourceCard({ source, action }: SourceCardProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <View style={[styles.card, { borderColor: palette.line, backgroundColor: palette.surface }]}>
      <BookText size={20} color={palette.muted} />
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={source.title ?? source.url}
        onPress={() => openExternalUrl(source.url)}
        style={styles.body}
      >
        <AppText variant="smallStrong" numberOfLines={1}>
          {source.title ?? source.url}
        </AppText>
        <AppText variant="caption" tone="subtle" numberOfLines={1}>
          {source.host}
        </AppText>
      </Pressable>
      {action ?? <ChevronRight size={20} color={palette.subtle} />}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: 14,
    paddingVertical: space.md,
    borderRadius: radius.md + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, minWidth: 0 },
})
