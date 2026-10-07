"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { resetPasswordInputSchema } from "@contraponha/validation"
import { useMutation } from "@tanstack/react-query"
import Link from "next/link"
import { useForm } from "react-hook-form"
import type { z } from "zod"

import { FormBanner } from "@/components/auth/form-banner"
import { PasswordInput } from "@/components/auth/password-input"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { errorMessage } from "@/lib/api-errors"

const resetPasswordFormSchema = resetPasswordInputSchema.pick({ newPassword: true })

type ResetPasswordValues = z.input<typeof resetPasswordFormSchema>

export interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  const mutation = useMutation({
    mutationFn: ({ newPassword }: ResetPasswordValues) =>
      api.auth.resetPassword({ token, newPassword }),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: "" },
  })

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col gap-5">
        <FormBanner tone="info" message={t("web.auth.resetDone")} />
        <Button asChild>
          <Link href="/login">{t("web.auth.signIn")}</Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit((values) => mutation.mutate(values))(event)}
      className="flex flex-col gap-5"
    >
      <FormBanner message={mutation.isError ? errorMessage({ error: mutation.error, t }) : null} />
      <Field
        label={t("web.auth.newPassword")}
        hint={t("web.auth.passwordHint")}
        error={errors.newPassword ? t("web.validation.passwordLength") : undefined}
      >
        {({ id, describedBy, isInvalid }) => (
          <PasswordInput
            id={id}
            autoComplete="new-password"
            aria-describedby={describedBy}
            aria-invalid={isInvalid}
            {...register("newPassword")}
          />
        )}
      </Field>
      <Button type="submit" size="lg" block isLoading={mutation.isPending}>
        {t("web.auth.resetSave")}
      </Button>
    </form>
  )
}
