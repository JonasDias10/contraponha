import {
  DIGEST_HOURS,
  formatDigestHour,
  NOTIFICATION_SWITCHES,
  toggleDigestHour,
} from "@contraponha/client-core"
import { useNotificationPreferences } from "@contraponha/client-core/react"
import { StyleSheet, View } from "react-native"

import { SettingsScreen } from "@/components/settings/settings-screen"
import { SettingsSection } from "@/components/settings/settings-section"
import { SwitchRow } from "@/components/ui/choice"
import { Tag } from "@/components/ui/chip"
import { LoadingView } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { useI18n } from "@/providers/i18n-provider"
import { useRequiredViewer } from "@/providers/session-provider"
import { space } from "@/lib/theme"

export default function NotificationSettingsScreen(): React.JSX.Element {
  const { t } = useI18n()
  const viewer = useRequiredViewer()
  const { preferences, save } = useNotificationPreferences()

  return (
    <SettingsScreen title={t("web.settings.notifications")}>
      {preferences ? (
        <>
          <SettingsSection title={t("web.notifications.preferencesTitle")}>
            {NOTIFICATION_SWITCHES.map(({ key, label }) => (
              <SwitchRow
                key={key}
                label={t(`web.notifications.${label}`)}
                value={preferences[key]}
                onChange={(value) => save({ [key]: value })}
              />
            ))}
            <AppText variant="caption" tone="subtle">
              {t("web.notifications.moderationAlways")}
            </AppText>
          </SettingsSection>
          <SettingsSection title={t("web.notifications.digestTitle")}>
            <AppText variant="small" tone="muted">
              {preferences.digestHours.length === 0
                ? t("web.notifications.digestImmediate")
                : t("web.notifications.digestBatch")}
            </AppText>
            <View style={styles.hours}>
              {DIGEST_HOURS.map((hour) => (
                <Tag
                  key={hour}
                  label={formatDigestHour(hour)}
                  isSelected={preferences.digestHours.includes(hour)}
                  onPress={() =>
                    save({
                      digestHours: toggleDigestHour({ hours: preferences.digestHours, hour }),
                    })
                  }
                />
              ))}
            </View>
            <AppText variant="caption" tone="subtle">
              {t("web.notifications.digestHint", { timezone: viewer.timezone })}
            </AppText>
          </SettingsSection>
        </>
      ) : (
        <LoadingView />
      )}
    </SettingsScreen>
  )
}

const styles = StyleSheet.create({
  hours: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
})
