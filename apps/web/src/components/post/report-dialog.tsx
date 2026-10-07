"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ReportReason, ReportSubject, type ReportTargetType } from "@ponto/types"
import { createReportInputSchema } from "@ponto/validation"
import { useMutation } from "@tanstack/react-query"
import { ShieldCheck } from "lucide-react"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioItem } from "@/components/ui/controls"
import { Field, Textarea } from "@/components/ui/field"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/overlays"
import { Banner, Panel } from "@/components/ui/surfaces"
import { errorMessage } from "@/lib/api-errors"

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

function blankToUndefined(value: string): string | undefined {
  return value.trim() === "" ? undefined : value
}

export interface ReportDialogProps {
  targetType: ReportTargetType
  targetId: string
  excerpt?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Two steps: what is happening, then the details. Attacks also ask who is being attacked.
export function ReportDialog({
  targetType,
  targetId,
  excerpt,
  open,
  onOpenChange,
}: ReportDialogProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const [step, setStep] = useState<1 | 2>(1)

  const { control, register, handleSubmit, reset } = useForm<ReportValues>({
    resolver: zodResolver(createReportInputSchema),
    defaultValues: { targetType, targetId, reason: ReportReason.SPAM },
  })

  const reason = useWatch({ control, name: "reason" })

  const close = (next: boolean): void => {
    onOpenChange(next)

    if (!next) {
      setStep(1)

      reset()
    }
  }

  const mutation = useMutation({
    mutationFn: (values: ReportValues) => api.moderation.report(values),
    onSuccess: () => {
      toast.success(t("web.report.sent"))

      close(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent closeLabel={t("web.common.close")}>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          {t(TITLE_KEYS[targetType])} ·{" "}
          {step === 1 ? t("web.report.stepReason") : t("web.report.stepDetails")}
        </p>
        <DialogTitle className="font-serif text-[25px] font-semibold leading-tight">
          {step === 1 ? t("web.report.whatHappens") : t(`web.report.${reason}`)}
        </DialogTitle>
        {excerpt ? (
          <Panel className="px-4 py-3 font-serif text-base leading-relaxed">“{excerpt}”</Panel>
        ) : null}
        <form
          noValidate
          onSubmit={(event) => void handleSubmit((values) => mutation.mutate(values))(event)}
          className="flex flex-col gap-5"
        >
          {step === 1 ? (
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="flex flex-col gap-3"
                >
                  {REASONS.map((value) => (
                    <label key={value} className="flex items-start gap-3 text-[15px]">
                      <RadioItem value={value} />
                      {t(`web.report.${value}`)}
                    </label>
                  ))}
                </RadioGroup>
              )}
            />
          ) : (
            <>
              {reason === ReportReason.HARASSMENT || reason === ReportReason.HATE ? (
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-3 text-sm font-semibold">
                    {t("web.report.whoIsTargeted")}
                  </legend>
                  <Controller
                    control={control}
                    name="subject"
                    render={({ field }) => (
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex flex-col gap-3"
                      >
                        {SUBJECTS.map(({ value, key }) => (
                          <label key={value} className="flex items-start gap-3 text-sm">
                            <RadioItem value={value} />
                            {t(key)}
                          </label>
                        ))}
                      </RadioGroup>
                    )}
                  />
                </fieldset>
              ) : null}
              <Field
                label={t("web.report.details", { optional: t("web.common.optional") })}
                hint={t("web.report.detailsHint")}
              >
                {({ id, describedBy }) => (
                  <Textarea
                    id={id}
                    aria-describedby={describedBy}
                    className="min-h-20"
                    {...register("details", { setValueAs: blankToUndefined })}
                  />
                )}
              </Field>
              <Banner tone="info" icon={<ShieldCheck className="size-5" />}>
                <DialogDescription>{t("web.report.anonymity")}</DialogDescription>
              </Banner>
              {mutation.isError ? (
                <Banner tone="danger">{errorMessage({ error: mutation.error, t })}</Banner>
              ) : null}
            </>
          )}
          <div className="flex justify-end gap-3">
            {step === 1 ? (
              <Button type="button" onClick={() => setStep(2)}>
                {t("web.common.continue")}
              </Button>
            ) : (
              <>
                <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                  {t("web.common.back")}
                </Button>
                <Button type="submit" isLoading={mutation.isPending}>
                  {t("web.report.send")}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
