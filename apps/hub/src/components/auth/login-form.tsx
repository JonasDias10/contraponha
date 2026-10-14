"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { loginInputSchema, type LoginInput } from "@contraponha/validation"
import {
  Button,
  Field,
  FormBanner,
  Input,
  PasswordInput,
  TwoFactorCodeForm,
  useI18n,
} from "@contraponha/web-ui"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"

import { completeTwoFactorSignIn, signIn } from "@/actions/auth"

export function LoginForm(): React.JSX.Element {
  const { t } = useI18n()
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [challengeToken, setChallengeToken] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: "", password: "" },
  })

  const handleLogin = async (values: LoginInput): Promise<void> => {
    setServerError(null)

    const result = await signIn(values)

    if (!result.ok) {
      setServerError(result.message)

      return
    }

    if ("challengeToken" in result) {
      setChallengeToken(result.challengeToken)

      return
    }

    enterHub()
  }

  const enterHub = (): void => {
    router.push("/")

    router.refresh()
  }

  if (challengeToken) {
    return (
      <TwoFactorCodeForm
        onSubmit={async (code) => {
          const result = await completeTwoFactorSignIn({ challengeToken, code })

          if (!result.ok) return result.message

          enterHub()

          return null
        }}
      />
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(handleLogin)(event)}
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
      <Button type="submit" size="lg" block isLoading={isSubmitting}>
        {t("hub.login.submit")}
      </Button>
    </form>
  )
}
