import { StyleSheet, Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ApiStatusBadge } from "@/components/ApiStatusBadge"
import { useApiReadiness } from "@/hooks/use-api-readiness"
import { useTranslator } from "@/hooks/use-translator"
import { usePalette } from "@/lib/theme"

export default function HomeScreen(): React.JSX.Element {
  const { locale, t } = useTranslator()
  const readiness = useApiReadiness(locale)
  const palette = usePalette()

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.surface }]}>
      <Text style={[styles.title, { color: palette.ink }]}>
        {t("app.name")}
        <Text style={{ color: palette.brand }}>.</Text>
      </Text>
      <Text style={[styles.tagline, { color: palette.muted }]}>{t("app.tagline")}</Text>
      <Text style={[styles.body, { color: palette.ink }]}>{t("app.foundationNotice")}</Text>
      <ApiStatusBadge readiness={readiness} label={t(`app.apiStatus.${readiness}`)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 44,
    fontWeight: "600",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 20,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
})
