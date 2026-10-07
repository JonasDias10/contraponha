import { StyleSheet, View } from "react-native"

import { Card } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { space } from "@/lib/theme"

export interface SettingsSectionProps {
  title: string
  lead?: string
  icon?: React.ReactNode
  tone?: "default" | "danger"
  children: React.ReactNode
}

export function SettingsSection({
  title,
  lead,
  icon,
  tone = "default",
  children,
}: SettingsSectionProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <Card
      style={[styles.card, tone === "danger" && { borderColor: palette.danger, borderWidth: 1 }]}
    >
      <View style={styles.heading}>
        <View style={styles.titleRow}>
          {icon}
          <AppText variant="heading3" accessibilityRole="header">
            {title}
          </AppText>
        </View>
        {lead ? (
          <AppText variant="small" tone="muted">
            {lead}
          </AppText>
        ) : null}
      </View>
      {children}
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.lg, padding: space.xl },
  heading: { gap: space.xs },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.md },
})
