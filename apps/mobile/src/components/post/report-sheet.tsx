import { errorMessage } from "@contraponha/client-core"
import { ReportReason, ReportSubject, type ReportTargetType } from "@contraponha/types"
import { createReportInputSchema } from "@contraponha/validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { ShieldCheck } from "lucide-react-native"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { StyleSheet, View } from "react-native"
import type { z } from "zod"

import { Button } from "@/components/ui/button"
import { RadioGroup } from "@/components/ui/choice"
import { Sheet } from "@/components/ui/sheet"
import { Banner } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"
import { radius, space } from "@/lib/theme"

const REASONS = [
  ReportReason.SPAM,
  ReportReason.HARASSMENT,
  ReportReason.HATE,
  ReportReason.MISINFORMATION,
  ReportReason.VIOLENCE,
  ReportReason.SEXUAL_CONTENT,
  ReportReason.OTHER,
] as const

const SUBJECTS = [
  { value: ReportSubject.ME, key: "web.report.subjectMe" },
  { value: ReportSubject.SOMEONE_ELSE, key: "web.report.subjectSomeoneElse" },
  { value: ReportSubject.GROUP, key: "web.report.subjectGroup" },
] as const

const TITLE_KEYS = {
  post: "web.report.post",
  comment: "web.report.comment",
  user: "web.report.user",
} as const

type ReportValues = z.input<typeof createReportInputSchema>

export interface ReportSheetProps {
  targetType: ReportTargetType
  targetId: string
  excerpt?: string | null
  isOpen: boolean
  onClose: () => void
}

// Two steps: what is happening, then the details. Attacks also ask who is being attacked.
export function ReportSheet({
  targetType,
  targetId,
  excerpt,
  isOpen,
  onClose,
}: ReportSheetProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const toast = useToast()
  const palette = usePalette()
  const [step, setStep] = useState<1 | 2>(1)

  const { control, handleSubmit, reset } = useForm<ReportValues>({
    resolver: zodResolver(createReportInputSchema),
    defaultValues: { targetType, targetId, reason: ReportReason.SPAM },
  })

  const reason = useWatch({ control, name: "reason" })

  const close = (): void => {
    setStep(1)

    reset()

    onClose()
  }

  const mutation = useMutation({
    mutationFn: (values: ReportValues) => api.moderation.report(values),
    onSuccess: () => {
      toast.success(t("web.report.sent"))

      close()
    },
  })

  const isAttack = reason === ReportReason.HARASSMENT || reason === ReportReason.HATE

  return (
    <Sheet
      isOpen={isOpen}
      title={`${t(TITLE_KEYS[targetType])} · ${step === 1 ? t("web.report.stepReason") : t("web.report.stepDetails")}`}
      onClose={close}
      footer={
        step === 1 ? (
          <Button label={t("web.common.continue")} onPress={() => setStep(2)} />
        ) : (
          <>
            <Button variant="ghost" label={t("web.common.back")} onPress={() => setStep(1)} />
            <Button
              label={t("web.report.send")}
              isLoading={mutation.isPending}
              onPress={() => void handleSubmit((values) => mutation.mutate(values))()}
            />
          </>
        )
      }
    >
      <AppText variant="heading2">
        {step === 1 ? t("web.report.whatHappens") : t(`web.report.${reason}`)}
      </AppText>
      {excerpt ? (
        <View style={[styles.excerpt, { backgroundColor: palette.surfaceSunken }]}>
          <AppText variant="reading">“{excerpt}”</AppText>
        </View>
      ) : null}
      {step === 1 ? (
        <Controller
          control={control}
          name="reason"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onChange={field.onChange}
              options={REASONS.map((value) => ({ value, label: t(`web.report.${value}`) }))}
            />
          )}
        />
      ) : (
        <View style={styles.details}>
          {isAttack ? (
            <View style={styles.details}>
              <AppText variant="smallStrong">{t("web.report.whoIsTargeted")}</AppText>
              <Controller
                control={control}
                name="subject"
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onChange={field.onChange}
                    options={SUBJECTS.map(({ value, key }) => ({ value, label: t(key) }))}
                  />
                )}
              />
            </View>
          ) : null}
          <Controller
            control={control}
            name="details"
            render={({ field }) => (
              <TextField
                label={t("web.report.details", { optional: t("web.common.optional") })}
                hint={t("web.report.detailsHint")}
                value={field.value ?? ""}
                onChangeText={(text) => field.onChange(text.trim() === "" ? undefined : text)}
                multiline
              />
            )}
          />
          <Banner tone="info" icon={<ShieldCheck size={20} color={palette.brand} />}>
            {t("web.report.anonymity")}
          </Banner>
          {mutation.isError ? (
            <Banner tone="danger">{errorMessage({ error: mutation.error, t })}</Banner>
          ) : null}
        </View>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  excerpt: { padding: space.lg, borderRadius: radius.md },
  details: { gap: space.lg },
})
