import { passwordStrength } from "@contraponha/client-core"
import { StyleSheet, View } from "react-native"

import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"

const LEVELS = {
  weak: { width: "25%", tone: "danger", key: "web.auth.passwordWeak" },
  fair: { width: "50%", tone: "warning", key: "web.auth.passwordFair" },
  strong: { width: "75%", tone: "success", key: "web.auth.passwordStrong" },
} as const

export interface PasswordStrengthMeterProps {
  password: string
}

export function PasswordStrengthMeter({
  password,
}: PasswordStrengthMeterProps): React.JSX.Element | null {
  const palette = usePalette()
  const { t } = useI18n()

  if (!password) return null

  const level = LEVELS[passwordStrength(password)]

  return (
    <View style={styles.wrapper} accessibilityLiveRegion="polite">
      <View style={[styles.track, { backgroundColor: palette.line }]}>
        <View style={[styles.bar, { width: level.width, backgroundColor: palette[level.tone] }]} />
      </View>
      <AppText variant="caption" tone={level.tone}>
        {t(level.key)}
      </AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 6, marginTop: -8 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  bar: { height: 4, borderRadius: 2 },
})
