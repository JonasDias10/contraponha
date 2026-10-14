"use client"

import { VerificationCategory, type Verification } from "@contraponha/types"
import { VERIFICATION_NOTE_MAX_LENGTH, type GrantVerificationInput } from "@contraponha/validation"
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
  useI18n,
} from "@contraponha/web-ui"
import { useState } from "react"

const CATEGORIES = Object.values(VerificationCategory)

function categoryOf(value: string): VerificationCategory | undefined {
  return CATEGORIES.find((category) => category === value)
}

export interface VerificationDialogProps {
  handle: string
  current: Verification | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (input: GrantVerificationInput) => void
  isPending: boolean
}

export function VerificationDialog({
  handle,
  current,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: VerificationDialogProps): React.JSX.Element {
  const { t } = useI18n()
  const [category, setCategory] = useState<VerificationCategory | undefined>(current?.category)
  const [note, setNote] = useState("")
  const trimmed = note.trim()

  const handleConfirm = (): void => {
    if (!category || !trimmed) return

    onConfirm({ category, note: trimmed })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("web.common.close")}>
        <DialogTitle className="pr-8 font-serif text-[25px] leading-tight font-semibold">
          {t("hub.user.verificationTitle", { handle })}
        </DialogTitle>
        <DialogDescription className="text-muted">
          {t("hub.user.verificationLead")}
        </DialogDescription>
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-semibold">
            {t("hub.user.verificationCategory")}
          </legend>
          <RadioGroup
            value={category ?? ""}
            onValueChange={(value) => setCategory(categoryOf(value))}
            className="grid gap-3 sm:grid-cols-2"
          >
            {CATEGORIES.map((value) => (
              <label key={value} className="flex items-center gap-3 text-sm">
                <RadioItem value={value} />
                {t(`web.verification.${value}`)}
              </label>
            ))}
          </RadioGroup>
        </fieldset>
        <Field label={t("hub.user.verificationNote")} hint={t("hub.user.verificationNoteHint")}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={note}
              required
              maxLength={VERIFICATION_NOTE_MAX_LENGTH}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">{t("web.common.cancel")}</Button>
          </DialogClose>
          <Button disabled={!category || !trimmed} isLoading={isPending} onClick={handleConfirm}>
            {t("hub.user.confirmVerification")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
