import { dateFromIso, dateOrderFor, formatIsoDate, isoFromDate } from "@contraponha/client-core"
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker"
import { CalendarDays, CircleAlert } from "lucide-react-native"
import { useState } from "react"
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button } from "@/components/ui/button"
import { AppText } from "@/components/ui/text"
import { useColorSchemeName, usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { radius, space, TOUCH_TARGET } from "@/lib/theme"

export interface DateFieldProps {
  label: string
  value: string
  onChange: (iso: string) => void
  minimumDate: Date
  maximumDate: Date
  defaultDate: Date
  hint?: string
  error?: string
}

export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  defaultDate,
  hint,
  error,
}: DateFieldProps): React.JSX.Element {
  const palette = usePalette()
  const scheme = useColorSchemeName()
  const insets = useSafeAreaInsets()
  const { locale, t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const selected = dateFromIso(value)
  const [draft, setDraft] = useState<Date>(selected ?? defaultDate)
  const display = value ? formatIsoDate({ iso: value, order: dateOrderFor(locale) }) : ""

  const open = (): void => {
    if (Platform.OS === "android") {
      DateTimePickerAndroid.open({
        value: selected ?? defaultDate,
        mode: "date",
        minimumDate,
        maximumDate,
        onValueChange: (_event, date) => onChange(isoFromDate(date)),
      })

      return
    }

    setDraft(selected ?? defaultDate)

    setIsOpen(true)
  }

  return (
    <View style={styles.wrapper}>
      <AppText variant="smallStrong">{label}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${display || t("web.common.datePlaceholder")}`}
        accessibilityHint={t("web.common.openCalendar")}
        onPress={open}
        style={[
          styles.field,
          {
            borderColor: error ? palette.danger : palette.lineStrong,
            borderWidth: error ? 2 : 1,
            backgroundColor: palette.surfaceRaised,
          },
        ]}
      >
        <AppText tone={display ? "ink" : "subtle"} style={styles.value}>
          {display || t("web.common.datePlaceholder")}
        </AppText>
        <CalendarDays size={20} color={palette.muted} />
      </Pressable>
      {error ? (
        <View style={styles.message}>
          <CircleAlert size={16} color={palette.danger} />
          <AppText variant="caption" tone="danger">
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" tone="subtle">
          {hint}
        </AppText>
      ) : null}
      {Platform.OS === "ios" ? (
        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        >
          <Pressable
            accessibilityLabel={t("web.common.close")}
            style={[styles.scrim, { backgroundColor: palette.scrim }]}
            onPress={() => setIsOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: palette.surfaceRaised, paddingBottom: insets.bottom + space.lg },
            ]}
          >
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              locale={locale}
              themeVariant={scheme}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onValueChange={(_event, date) => setDraft(date)}
            />
            <View style={styles.actions}>
              <Button
                variant="ghost"
                label={t("web.common.cancel")}
                onPress={() => setIsOpen(false)}
              />
              <Button
                label={t("web.common.confirm")}
                onPress={() => {
                  onChange(isoFromDate(draft))

                  setIsOpen(false)
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  field: {
    minHeight: TOUCH_TARGET,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  value: { flex: 1, fontSize: 16, fontVariant: ["tabular-nums"] },
  message: { flexDirection: "row", alignItems: "center", gap: 6 },
  scrim: { position: "absolute", inset: 0 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.lg,
    paddingHorizontal: space.gutter,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: space.sm },
})
