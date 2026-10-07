"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { requestMagicLinkInputSchema, type RequestMagicLinkInput } from "@contraponha/validation"
import { useMutation } from "@tanstack/react-query"
import { useForm } from "react-hook-form"

import { FormBanner } from "@/components/auth/form-banner"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/field"
import { errorMessage } from "@/lib/api-errors"

export interface EmailRequestFormProps {
  purpose: "magic-link" | "password-reset"
}

// Both flows take only an email and always answer the same way, so the form never
// reveals whether an account exists.
export function EmailRequestForm({ purpose }: EmailRequestFormProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  const mutation = useMutation({
    mutationFn: (input: RequestMagicLinkInput) =>
      purpose === "magic-link"
        ? api.auth.requestMagicLink(input)
        : api.auth.requestPasswordReset(input),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestMagicLinkInput>({
    resolver: zodResolver(requestMagicLinkInputSchema),
    defaultValues: { email: "" },
  })

  if (mutation.isSuccess) {
    return (
      <FormBanner
        tone="info"
        message={purpose === "magic-link" ? t("web.auth.magicLinkSent") : t("web.auth.forgotSent")}
      />
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
        label={t("web.auth.email")}
        error={errors.email ? t("web.validation.email") : undefined}
      >
        {({ id, describedBy, isInvalid }) => (
          <Input
            id={id}
            type="email"
            autoComplete="email"
            aria-describedby={describedBy}
            aria-invalid={isInvalid}
            {...register("email")}
          />
        )}
      </Field>
      <Button type="submit" size="lg" block isLoading={mutation.isPending}>
        {purpose === "magic-link" ? t("web.auth.magicLinkSend") : t("web.auth.forgotSend")}
      </Button>
    </form>
  )
}
