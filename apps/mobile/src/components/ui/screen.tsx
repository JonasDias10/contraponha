import { router } from "expo-router"
import { ArrowLeft } from "lucide-react-native"
import { ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native"
import { SafeAreaView, type Edge } from "react-native-safe-area-context"

import { IconButton } from "@/components/ui/icon-button"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { space } from "@/lib/theme"

export interface ScreenProps {
  children: React.ReactNode
  edges?: Edge[]
}

export function Screen({ children, edges = ["top"] }: ScreenProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <SafeAreaView edges={edges} style={[styles.screen, { backgroundColor: palette.surface }]}>
      {children}
    </SafeAreaView>
  )
}

export interface ScreenHeaderProps {
  title?: string
  canGoBack?: boolean
  right?: React.ReactNode
}

export function ScreenHeader({
  title,
  canGoBack = true,
  right,
}: ScreenHeaderProps): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()

  return (
    <View style={[styles.header, { borderBottomColor: palette.line }]}>
      {canGoBack ? (
        <IconButton
          icon={ArrowLeft}
          label={t("web.common.back")}
          color={palette.ink}
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
        />
      ) : null}
      <AppText variant="heading3" numberOfLines={1} style={styles.title}>
        {title}
      </AppText>
      <View style={styles.right}>{right}</View>
    </View>
  )
}

export function ScrollContent({
  contentContainerStyle,
  ...props
}: ScrollViewProps): React.JSX.Element {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, contentContainerStyle]}
      {...props}
    />
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1 },
  right: { flexDirection: "row", alignItems: "center" },
  content: { padding: space.gutter, gap: space.lg, paddingBottom: 48 },
})
