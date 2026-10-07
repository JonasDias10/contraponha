"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { loginInputSchema, type LoginInput } from "@ponto/validation"
import { Mail } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { signIn } from "@/actions/auth"
import { FormBanner } from "@/components/auth/form-banner"
import { PasswordInput } from "@/components/auth/password-input"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/field"

export function SignInForm(): React.JSX.Element {
  const { t } = useI18n()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: LoginInput): Promise<void> => {
    setServerError(null)

    const result = await signIn(values)

    if (!result.ok) {
      setServerError(result.message)

      return
    }

    router.push(result.isOnboarded ? "/home" : "/onboarding")

    router.refresh()
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-5"
    >
      <FormBanner message={serverError} />
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
      <Field
        label={t("web.auth.password")}
        error={errors.password ? t("web.validation.required") : undefined}
      >
        {({ id, describedBy, isInvalid }) => (
          <PasswordInput
            id={id}
            autoComplete="current-password"
            aria-describedby={describedBy}
            aria-invalid={isInvalid}
            {...register("password")}
          />
        )}
      </Field>
      <Link href="/forgot-password" className="-mt-2 self-end text-sm text-brand underline">
        {t("web.auth.forgotPassword")}
      </Link>
      <Button type="submit" size="lg" block isLoading={isSubmitting}>
        {t("web.auth.signIn")}
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
