"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { MessageKey } from "@contraponha/i18n"
import { registerInputSchema } from "@contraponha/validation"
import { Mail } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { signUp } from "@/actions/auth"
import { FormBanner } from "@/components/auth/form-banner"
import { PasswordInput } from "@/components/auth/password-input"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/controls"
import { Field, Input } from "@/components/ui/field"
import { cn } from "@/lib/cn"
import { passwordStrength } from "@/lib/password-strength"

// The checkbox starts unchecked, so the form holds a boolean and the shared schema's
// literal true is checked on submit.
const signUpFormSchema = registerInputSchema.omit({ acceptedTerms: true }).extend({
  acceptedTerms: z.boolean().refine(Boolean),
})

type SignUpValues = z.input<typeof signUpFormSchema>

type FieldName = keyof SignUpValues

const FIELD_MESSAGES: Partial<Record<FieldName, MessageKey>> = {
  displayName: "web.validation.required",
  handle: "web.validation.handleFormat",
  email: "web.validation.email",
  password: "web.validation.passwordLength",
  birthDate: "web.validation.age",
  acceptedTerms: "web.validation.terms",
}

function isFieldName(path: string): path is FieldName {
  return path in FIELD_MESSAGES
}

const STRENGTH_STYLE = {
  weak: { width: "w-1/4", color: "bg-danger", key: "web.auth.passwordWeak" },
  fair: { width: "w-1/2", color: "bg-warning", key: "web.auth.passwordFair" },
  strong: { width: "w-3/4", color: "bg-success", key: "web.auth.passwordStrong" },
} as const

export function SignUpForm(): React.JSX.Element {
  const { t } = useI18n()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      displayName: "",
      handle: "",
      email: "",
      password: "",
      birthDate: "",
      acceptedTerms: false,
    },
  })

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = form

  const fieldError = (name: FieldName): string | undefined => {
    const key = FIELD_MESSAGES[name]
    return errors[name] && key ? t(key) : undefined
  }

  const password = useWatch({ control, name: "password" })
  const strength = password ? STRENGTH_STYLE[passwordStrength(password)] : null

  const onSubmit = async (values: SignUpValues): Promise<void> => {
    setServerError(null)

    const result = await signUp({ ...values, acceptedTerms: true })

    if (result.ok) {
      router.push("/onboarding")

      router.refresh()

      return
    }

    for (const { path } of result.issues) if (isFieldName(path)) setError(path, { type: "server" })

    if (result.issues.length === 0) setServerError(result.message)
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-5"
    >
      <FormBanner message={serverError} />
      <Field
        label={t("web.auth.name")}
        hint={t("web.auth.nameHint")}
        error={fieldError("displayName")}
      >
        {({ id, describedBy, isInvalid }) => (
          <Input
            id={id}
            autoComplete="name"
            aria-describedby={describedBy}
            aria-invalid={isInvalid}
            {...register("displayName")}
          />
        )}
      </Field>
      <Field
        label={t("web.auth.handle")}
        hint={t("web.auth.handleHint")}
        error={fieldError("handle")}
      >
        {({ id, describedBy, isInvalid }) => (
          <div className={cn("relative")}>
            <span aria-hidden className="absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle">
              @
            </span>
            <Input
              id={id}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="pl-8"
              aria-describedby={describedBy}
              aria-invalid={isInvalid}
              {...register("handle")}
            />
          </div>
        )}
      </Field>
      <Field label={t("web.auth.email")} hint={t("web.auth.emailHint")} error={fieldError("email")}>
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
      <Field
        label={t("web.auth.password")}
        hint={strength ? t(strength.key) : t("web.auth.passwordHint")}
        error={fieldError("password")}
      >
        {({ id, describedBy, isInvalid }) => (
          <>
            <PasswordInput
              id={id}
              autoComplete="new-password"
              aria-describedby={describedBy}
              aria-invalid={isInvalid}
              {...register("password")}
            />
            <div aria-hidden className="h-1 overflow-hidden rounded-full bg-line">
              {strength ? (
                <span className={cn("block h-full rounded-full", strength.width, strength.color)} />
              ) : null}
            </div>
          </>
        )}
      </Field>
      <Field
        label={t("web.auth.birthDate")}
        hint={t("web.auth.birthDateHint")}
        error={fieldError("birthDate")}
      >
        {({ id, describedBy, isInvalid }) => (
          <Input
            id={id}
            type="date"
            autoComplete="bday"
            aria-describedby={describedBy}
            aria-invalid={isInvalid}
            {...register("birthDate")}
          />
        )}
      </Field>
      <div className="flex flex-col gap-1.5">
        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field }) => (
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                aria-invalid={Boolean(errors.acceptedTerms)}
              />
              <span>
                {t("web.auth.acceptTermsBefore")}{" "}
                <Link href="/terms" className="text-brand underline">
                  {t("web.auth.acceptTermsTerms")}
                </Link>
                ,{" "}
                <Link href="/privacy" className="text-brand underline">
                  {t("web.auth.acceptTermsPrivacy")}
                </Link>{" "}
                {t("web.auth.acceptTermsAnd")}{" "}
                <Link href="/guidelines" className="text-brand underline">
                  {t("web.auth.acceptTermsGuidelines")}
                </Link>
                .
              </span>
            </label>
          )}
        />
        {fieldError("acceptedTerms") ? (
          <p role="alert" className="text-[13px] text-danger">
            {fieldError("acceptedTerms")}
          </p>
        ) : null}
      </div>
      <Button type="submit" size="lg" block isLoading={isSubmitting}>
        {t("web.common.continue")}
      </Button>
      <div className="flex items-center gap-3">
        <hr className="h-px flex-1 border-0 bg-line" />
        <span className="text-[13px] text-subtle">{t("web.common.or")}</span>
        <hr className="h-px flex-1 border-0 bg-line" />
      </div>
      <Button asChild variant="secondary" size="lg" block>
        <Link href="/login/link">
          <Mail aria-hidden className="size-5" />
          {t("web.auth.magicLink")}
        </Link>
      </Button>
    </form>
  )
}
