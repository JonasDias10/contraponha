import type { LucideIcon } from "lucide-react-native"
import { Modal, Pressable, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { radius, space, TOUCH_TARGET } from "@/lib/theme"

export interface BottomSheetProps {
  isOpen: boolean
  title?: string
  onClose: () => void
  children: React.ReactNode
}

export function BottomSheet({
  isOpen,
  title,
  onClose,
  children,
}: BottomSheetProps): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("web.common.close")}
        style={[styles.scrim, { backgroundColor: palette.scrim }]}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: palette.surfaceRaised, paddingBottom: insets.bottom + space.sm },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: palette.line }]} />
        {title ? (
          <AppText variant="smallStrong" tone="muted" style={styles.title}>
            {title}
          </AppText>
        ) : null}
        {children}
      </View>
    </Modal>
  )
}

export interface ActionSheetItem {
  key: string
  label: string
  icon?: LucideIcon
  tone?: "default" | "danger"
  onPress: () => void
}

export interface ActionSheetProps {
  isOpen: boolean
  title?: string
  items: ActionSheetItem[]
  onClose: () => void
}

export function ActionSheet({
  isOpen,
  title,
  items,
  onClose,
}: ActionSheetProps): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()

  return (
    <BottomSheet isOpen={isOpen} title={title} onClose={onClose}>
      {items.map(({ key, label, icon: Icon, tone = "default", onPress }) => {
        const color = tone === "danger" ? palette.danger : palette.ink

        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            onPress={() => {
              onClose()

              onPress()
            }}
            style={({ pressed }) => [
              styles.item,
              pressed && { backgroundColor: palette.surfaceSunken },
            ]}
          >
            {Icon ? <Icon size={20} color={color} /> : null}
            <AppText style={{ color }}>{label}</AppText>
          </Pressable>
        )
      })}
      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        style={({ pressed }) => [
          styles.item,
          pressed && { backgroundColor: palette.surfaceSunken },
        ]}
      >
        <AppText tone="muted">{t("web.common.cancel")}</AppText>
      </Pressable>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  scrim: { position: "absolute", inset: 0 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.sm,
    paddingHorizontal: space.sm,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: space.sm },
  title: { paddingHorizontal: space.md, paddingVertical: space.sm },
  item: {
    minHeight: TOUCH_TARGET + 8,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
  },
})
