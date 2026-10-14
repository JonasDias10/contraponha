"use client"

import { twoFactorCodeSchema } from "@contraponha/validation"
import { useState } from "react"

import { Button } from "./button.js"
import { Field, Input } from "./field.js"
import { FormBanner } from "./form-banner.js"
import { useI18n } from "./i18n-provider.js"

export interface TwoFactorCodeFormProps {
  // Resolves to an error message to show, or null when the code was accepted.
  onSubmit: (code: string) => Promise<string | null>
}

// Second step of signing in, the same in the web app and the hub.
export function TwoFactorCodeForm({ onSubmit }: TwoFactorCodeFormProps): React.JSX.Element {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isValid = twoFactorCodeSchema.safeParse(code).success

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()

    if (!isValid) return

    setIsSubmitting(true)

    const message = await onSubmit(code)

    setIsSubmitting(false)

    setError(message)
  }

  return (
    <form noValidate onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-[22px] font-semibold">{t("web.twoFactor.loginTitle")}</h2>
        <p className="text-sm text-muted">{t("web.twoFactor.loginLead")}</p>
      </div>
      <FormBanner message={error} />
      <Field label={t("web.twoFactor.codeOrRecovery")}>
        {({ id }) => (
          <Input
            id={id}
            value={code}
            autoFocus
            autoComplete="one-time-code"
            inputMode="text"
            spellCheck={false}
            onChange={(event) => setCode(event.target.value)}
          />
        )}
      </Field>
      <Button type="submit" size="lg" block isLoading={isSubmitting} disabled={!isValid}>
        {t("web.twoFactor.verify")}
      </Button>
    </form>
  )
}
