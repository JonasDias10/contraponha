import { X } from "lucide-react-native"
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { IconButton } from "@/components/ui/icon-button"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { space } from "@/lib/theme"

export interface SheetProps {
  isOpen: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}

// Full-height page sheet for forms and long content (dialogs on the web).
export function Sheet({ isOpen, title, onClose, children, footer }: SheetProps): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        edges={["bottom", "top"]}
        style={[styles.fill, { backgroundColor: palette.surface }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.fill}
        >
          <View style={[styles.header, { borderBottomColor: palette.line }]}>
            <AppText variant="heading3" style={styles.title} numberOfLines={1}>
              {title}
            </AppText>
            <IconButton
              icon={X}
              label={t("web.common.close")}
              color={palette.ink}
              onPress={onClose}
            />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
          {footer ? (
            <View style={[styles.footer, { borderTopColor: palette.line }]}>{footer}</View>
          ) : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: space.gutter,
    paddingRight: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1 },
  content: { padding: space.gutter, gap: space.lg },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: space.sm,
    padding: space.gutter,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
})
