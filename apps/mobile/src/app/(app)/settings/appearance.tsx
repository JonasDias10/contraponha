import { errorMessage, LOCALE_NAMES, queryKeys } from "@contraponha/client-core"
import { SUPPORTED_LOCALES, type Locale } from "@contraponha/i18n"
import type { UpdateProfileInput } from "@contraponha/validation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronRight } from "lucide-react-native"
import { useState } from "react"
import { FlatList, Pressable, StyleSheet, View } from "react-native"

import { SettingsScreen } from "@/components/settings/settings-screen"
import { SettingsSection } from "@/components/settings/settings-section"
import { RadioGroup } from "@/components/ui/choice"
import { Segmented } from "@/components/ui/segmented"
import { Sheet } from "@/components/ui/sheet"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { usePreferences, type ThemePreference } from "@/providers/preferences-provider"
import { useApi, useRequiredViewer } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"
import { radius, TOUCH_TARGET } from "@/lib/theme"

function timeZones(current: string): string[] {
  const all = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : []
  const american = all.filter((zone) => zone.startsWith("America/"))

  return american.includes(current) ? american : [current, ...american]
}

function zoneLabel(zone: string): string {
  return zone.replace("America/", "").replaceAll("_", " ")
}

export default function AppearanceSettingsScreen(): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()
  const viewer = useRequiredViewer()
  const toast = useToast()
  const palette = usePalette()
  const preferences = usePreferences()
  const queryClient = useQueryClient()
  const [isPickingZone, setIsPickingZone] = useState(false)

  const updateAccount = useMutation({
    mutationFn: (input: UpdateProfileInput) => api.users.updateMe(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated)

      toast.success(t("web.settings.profileSaved"))
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  // The app remembers the language and the account keeps it too, so emails follow it.
  const changeLocale = (next: Locale): void => {
    preferences.setLocale(next)

    updateAccount.mutate({ locale: next })
  }

  return (
    <SettingsScreen title={t("web.settings.appearance")}>
      <SettingsSection title={t("web.settings.appearanceTitle")}>
        <AppText variant="smallStrong">{t("web.settings.theme")}</AppText>
        <Segmented<ThemePreference>
          value={preferences.theme}
          onChange={preferences.setTheme}
          options={[
            { value: "system", label: t("web.footer.themeSystem") },
            { value: "light", label: t("web.footer.themeLight") },
            { value: "dark", label: t("web.footer.themeDark") },
          ]}
        />
        <AppText variant="smallStrong">{t("web.settings.language")}</AppText>
        <RadioGroup
          value={locale}
          onChange={changeLocale}
          options={SUPPORTED_LOCALES.map((option) => ({
            value: option,
            label: LOCALE_NAMES[option],
          }))}
        />
        <AppText variant="smallStrong">{t("web.settings.timezone")}</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t("web.settings.timezone")}: ${zoneLabel(viewer.timezone)}`}
          onPress={() => setIsPickingZone(true)}
          style={[
            styles.select,
            { borderColor: palette.lineStrong, backgroundColor: palette.surfaceRaised },
          ]}
        >
          <AppText style={styles.flex}>{zoneLabel(viewer.timezone)}</AppText>
          <ChevronRight size={18} color={palette.muted} />
        </Pressable>
        <AppText variant="caption" tone="subtle">
          {t("web.settings.timezoneHint")}
        </AppText>
      </SettingsSection>
      <Sheet
        isOpen={isPickingZone}
        title={t("web.settings.timezone")}
        onClose={() => setIsPickingZone(false)}
      >
        <View>
          <FlatList
            data={timeZones(viewer.timezone)}
            scrollEnabled={false}
            keyExtractor={(zone) => zone}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: item === viewer.timezone }}
                onPress={() => {
                  setIsPickingZone(false)

                  updateAccount.mutate({ timezone: item })
                }}
                style={styles.zone}
              >
                <AppText
                  variant={item === viewer.timezone ? "bodyStrong" : "body"}
                  tone={item === viewer.timezone ? "brand" : "ink"}
                >
                  {zoneLabel(item)}
                </AppText>
              </Pressable>
            )}
          />
        </View>
      </Sheet>
    </SettingsScreen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  select: {
    minHeight: TOUCH_TARGET,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  zone: { minHeight: TOUCH_TARGET, justifyContent: "center" },
})
