import type { ComposerValues } from "@contraponha/client-core"
import { POST_SOURCES_MAX } from "@contraponha/config"
import { BookText, Plus, X } from "lucide-react-native"
import { Controller, useFieldArray, type FieldErrors } from "react-hook-form"
import { StyleSheet, View } from "react-native"

import type { ComposerControl } from "@/components/composer/composer-control"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { radius, space } from "@/lib/theme"

export interface SourcesFieldProps {
  control: ComposerControl
  errors: FieldErrors<ComposerValues>
}

export function SourcesField({ control, errors }: SourcesFieldProps): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const { fields, append, remove } = useFieldArray({ control, name: "sources" })

  return (
    <View style={styles.group}>
      <AppText variant="smallStrong">{t("web.composer.sources")}</AppText>
      {fields.map((field, index) => (
        <View
          key={field.id}
          style={[styles.source, { borderColor: palette.line, backgroundColor: palette.surface }]}
        >
          <View style={styles.row}>
            <BookText size={20} color={palette.muted} />
            <View style={styles.flex}>
              <Controller
                control={control}
                name={`sources.${index}.url`}
                render={({ field: input }) => (
                  <TextField
                    aria-label={t("web.composer.sourceUrl")}
                    placeholder="https://"
                    value={input.value}
                    onChangeText={input.onChange}
                    onBlur={input.onBlur}
                    autoCapitalize="none"
                    keyboardType="url"
                    error={errors.sources?.[index]?.url ? t("web.validation.url") : undefined}
                  />
                )}
              />
            </View>
            <IconButton
              icon={X}
              size={18}
              label={t("web.composer.removeSource")}
              onPress={() => remove(index)}
            />
          </View>
          <Controller
            control={control}
            name={`sources.${index}.title`}
            render={({ field: input }) => (
              <TextField
                placeholder={t("web.composer.sourceTitle", { optional: t("web.common.optional") })}
                value={input.value}
                onChangeText={input.onChange}
                onBlur={input.onBlur}
              />
            )}
          />
        </View>
      ))}
      {fields.length < POST_SOURCES_MAX ? (
        <Button
          variant="secondary"
          icon={Plus}
          isBlock
          label={
            fields.length === 0 ? t("web.composer.addSource") : t("web.composer.addAnotherSource")
          }
          onPress={() => append({ url: "", title: "" })}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: space.md },
  source: {
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  flex: { flex: 1 },
})
