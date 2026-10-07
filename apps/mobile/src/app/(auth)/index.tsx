import { router } from "expo-router"
import { Check } from "lucide-react-native"
import { StyleSheet, View } from "react-native"

import { openLegalPage } from "@/components/auth/legal-links"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Screen } from "@/components/ui/screen"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { space } from "@/lib/theme"

const POINTS = [
  "web.auth.asidePointReactions",
  "web.auth.asidePointFeeds",
  "web.auth.asidePointTransparency",
] as const

export default function WelcomeScreen(): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={styles.container}>
        <Logo size={26} />
        <View style={styles.hero}>
          <AppText variant="overline" tone="muted">
            {t("web.landing.overline")}
          </AppText>
          <AppText variant="display" accessibilityRole="header">
            {t("web.landing.title")}
          </AppText>
          <View style={styles.points}>
            {POINTS.map((key) => (
              <View key={key} style={styles.point}>
                <Check size={18} color={palette.brand} style={styles.pointIcon} />
                <AppText tone="muted" style={styles.pointText}>
                  {t(key)}
                </AppText>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.actions}>
          <Button
            size="lg"
            isBlock
            label={t("web.landing.createAccount")}
            onPress={() => router.push("/signup")}
          />
          <Button
            size="lg"
            variant="secondary"
            isBlock
            label={t("web.auth.signIn")}
            onPress={() => router.push("/login")}
          />
          <AppText
            variant="caption"
            tone="subtle"
            style={styles.note}
            onPress={() => openLegalPage("privacy")}
          >
            {t("web.landing.dataNote")}
          </AppText>
        </View>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.gutter, paddingTop: space.xxl, gap: space.xxxl },
  hero: { flex: 1, justifyContent: "center", gap: space.lg },
  points: { gap: space.md, marginTop: space.sm },
  point: { flexDirection: "row", gap: space.md },
  pointIcon: { marginTop: 2 },
  pointText: { flex: 1 },
  actions: { gap: space.md },
  note: { textAlign: "center" },
})
