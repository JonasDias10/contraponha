"use client"

import type { CommunityRule } from "@contraponha/types"
import type { SuspendUserInput } from "@contraponha/validation"
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  Input,
  RadioGroup,
  RadioItem,
  RuleSelect,
  useI18n,
} from "@contraponha/web-ui"
import { useState } from "react"

const DURATIONS = ["1", "7", "30", "permanent"] as const

type Duration = (typeof DURATIONS)[number]

const DAY_MS = 24 * 60 * 60 * 1000

function endsAtFor(duration: Duration): string | null {
  return duration === "permanent"
    ? null
    : new Date(Date.now() + Number(duration) * DAY_MS).toISOString()
}

function durationOf(value: string): Duration | undefined {
  return DURATIONS.find((duration) => duration === value)
}

export interface SuspendDialogProps {
  handle: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (input: SuspendUserInput) => void
  isPending: boolean
}

export function SuspendDialog({
  handle,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: SuspendDialogProps): React.JSX.Element {
  const { t } = useI18n()
  const [rule, setRule] = useState<CommunityRule>()
  const [duration, setDuration] = useState<Duration>("7")
  const [note, setNote] = useState("")

  const durationLabel = (value: Duration): string => {
    if (value === "permanent") return t("hub.user.permanent")

    return value === "1" ? t("hub.user.durationDay") : t("hub.user.durationDays", { count: value })
  }

  const handleConfirm = (): void => {
    if (!rule) return

    onConfirm({ rule, endsAt: endsAtFor(duration), note: note.trim() || undefined })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("web.common.close")}>
        <DialogTitle className="pr-8 font-serif text-[25px] leading-tight font-semibold">
          {t("hub.user.suspendTitle", { handle })}
        </DialogTitle>
        <DialogDescription className="text-muted">{t("hub.user.suspendLead")}</DialogDescription>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold">{t("hub.user.duration")}</legend>
          <RadioGroup
            value={duration}
            onValueChange={(value) => {
              const next = durationOf(value)

              if (next) setDuration(next)
            }}
            className="grid gap-3 sm:grid-cols-2"
          >
            {DURATIONS.map((value) => (
              <label key={value} className="flex items-center gap-3 text-sm">
                <RadioItem value={value} />
                {durationLabel(value)}
              </label>
            ))}
          </RadioGroup>
        </fieldset>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold">{t("hub.user.rule")}</legend>
          <RuleSelect value={rule} onChange={setRule} />
        </fieldset>
        <Field label={t("hub.user.note")}>
          {({ id }) => (
            <Input
              id={id}
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">{t("web.common.cancel")}</Button>
          </DialogClose>
          <Button variant="danger" disabled={!rule} isLoading={isPending} onClick={handleConfirm}>
            {t("hub.user.confirmSuspend")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
