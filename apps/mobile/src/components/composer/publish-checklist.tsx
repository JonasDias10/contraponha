import { readingMinutes, wordCount } from "@contraponha/client-core"
import { Check, Info } from "lucide-react-native"
import { Controller } from "react-hook-form"
import { StyleSheet, View } from "react-native"

import type { ComposerControl } from "@/components/composer/composer-control"
import { RadioGroup } from "@/components/ui/choice"
import { Card, Divider } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { radius, space } from "@/lib/theme"

const IDEAL_WORDS_MAX = 1200

export interface PublishChecklistProps {
  control: ComposerControl
  title: string
  body: string
  sourceCount: number
}

interface CheckItemProps {
  isDone: boolean
  text: string
}

function CheckItem({ isDone, text }: CheckItemProps): React.JSX.Element {
  const palette = usePalette()

  return (
    <View style={styles.check}>
      <View
        style={[
          styles.badge,
          { backgroundColor: isDone ? palette.successSoft : palette.warningSoft },
        ]}
      >
        {isDone ? (
          <Check size={14} color={palette.success} />
        ) : (
          <Info size={14} color={palette.warning} />
        )}
      </View>
      <AppText variant="small" style={styles.flex}>
        {text}
      </AppText>
    </View>
  )
}

// Nudges, never blocks: posts publish without a title or source, but the panel explains why
// they help the discussion.
export function PublishChecklist({
  control,
  title,
  body,
  sourceCount,
}: PublishChecklistProps): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const words = wordCount(body)

  return (
    <View style={styles.wrapper}>
      <Card style={styles.card}>
        <AppText variant="bodyStrong">{t("web.composer.beforePublishing")}</AppText>
        <CheckItem
          isDone={sourceCount > 0}
          text={
            sourceCount > 0
              ? t("web.composer.checkSource", { count: sourceCount })
              : t("web.composer.checkNoSource")
          }
        />
        <CheckItem
          isDone={title.trim().length > 0}
          text={title.trim() ? t("web.composer.checkTitle") : t("web.composer.checkNoTitle")}
        />
        <Divider />
        <AppText variant="smallStrong">{t("web.composer.whoCanContribute")}</AppText>
        <Controller
          control={control}
          name="replyPolicy"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "everyone", label: t("web.composer.everyone") },
                { value: "following", label: t("web.composer.followingOnly") },
              ]}
            />
          )}
        />
        <AppText variant="caption" tone="subtle">
          {t("web.composer.editLater")}
        </AppText>
      </Card>
      <View style={[styles.stats, { backgroundColor: palette.surfaceSunken }]}>
        <AppText variant="caption" tone="subtle">
          {t("web.composer.stats", { minutes: readingMinutes(body), words })}
        </AppText>
        <View style={[styles.track, { backgroundColor: palette.line }]}>
          <View
            style={[
              styles.bar,
              {
                backgroundColor: palette.brand,
                width: `${Math.min(100, (words / IDEAL_WORDS_MAX) * 100)}%`,
              },
            ]}
          />
        </View>
        <AppText variant="caption" tone="subtle">
          {t("web.composer.lengthTip")}
        </AppText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: space.lg },
  card: { gap: space.md, padding: space.xl },
  check: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1 },
  stats: { gap: space.sm, padding: space.lg, borderRadius: radius.lg },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  bar: { height: 4, borderRadius: 2 },
})
