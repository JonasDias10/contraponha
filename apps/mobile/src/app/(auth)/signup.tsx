import { errorMessage, handleFieldMessages, validationIssues } from "@contraponha/client-core"
import { useHandleAvailability } from "@contraponha/client-core/react"
import { MINIMUM_AGE_YEARS } from "@contraponha/config"
import type { MessageKey } from "@contraponha/i18n"
import { registerInputSchema } from "@contraponha/validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { StyleSheet, View } from "react-native"
import { z } from "zod"

import { AuthScreen } from "@/components/auth/auth-screen"
import { openLegalPage } from "@/components/auth/legal-links"
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/choice"
import { DateField } from "@/components/ui/date-field"
import { Banner } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { TextLink } from "@/components/ui/text-link"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useSession } from "@/providers/session-provider"
import { space } from "@/lib/theme"

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

const TODAY = new Date()
const BIRTH_DATE_START = new Date(TODAY.getFullYear() - 120, 0, 1)

const BIRTH_DATE_END = new Date(
  TODAY.getFullYear() - MINIMUM_AGE_YEARS,
  TODAY.getMonth(),
  TODAY.getDate(),
)

const BIRTH_DATE_DEFAULT = new Date(TODAY.getFullYear() - 25, 0, 1)

export default function SignUpScreen(): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()
  const { signIn } = useSession()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
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

  const password = useWatch({ control, name: "password" })

  const handle = useWatch({ control, name: "handle" })
  const handleAvailability = useHandleAvailability(handle)
  const handleMessages = handleFieldMessages({ availability: handleAvailability, t })

  const fieldError = (name: FieldName): string | undefined => {
    const key = FIELD_MESSAGES[name]

    return errors[name] && key ? t(key) : undefined
  }

  const onSubmit = async (values: SignUpValues): Promise<void> => {
    setServerError(null)

    if (handleAvailability.status === "taken") {
      setError("handle", { type: "server" }, { shouldFocus: true })

      return
    }

    try {
      const auth = await api.auth.register({ ...values, acceptedTerms: true, locale })

      await signIn(auth)
    } catch (error) {
      const issues = validationIssues(error)

      for (const { path } of issues) if (isFieldName(path)) setError(path, { type: "server" })

      if (issues.length === 0) setServerError(errorMessage({ error, t }))
    }
  }

  return (
    <AuthScreen
      title={t("web.auth.signUpTitle")}
      lead={
        <AppText tone="muted">
          {t("web.auth.haveAccount")}{" "}
          <TextLink href="/login" isReplace>
            {t("web.auth.signIn")}
          </TextLink>
        </AppText>
      }
    >
      <View style={styles.form}>
        {serverError ? <Banner tone="danger">{serverError}</Banner> : null}
        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <TextField
              label={t("web.auth.name")}
              hint={t("web.auth.nameHint")}
              error={fieldError("displayName")}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoComplete="name"
              textContentType="name"
            />
          )}
        />
        <Controller
          control={control}
          name="handle"
          render={({ field }) => (
            <TextField
              label={t("web.auth.handle")}
              hint={handleMessages.success ?? handleMessages.hint}
              error={handleMessages.error ?? fieldError("handle")}
              prefix="@"
              value={field.value}
              onChangeText={(text) => field.onChange(text.toLowerCase())}
              onBlur={field.onBlur}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              textContentType="username"
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label={t("web.auth.email")}
              hint={t("web.auth.emailHint")}
              error={fieldError("email")}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              label={t("web.auth.password")}
              hint={t("web.auth.passwordHint")}
              error={fieldError("password")}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              isPassword
              autoComplete="new-password"
              textContentType="newPassword"
            />
          )}
        />
        <PasswordStrengthMeter password={password} />
        <Controller
          control={control}
          name="birthDate"
          render={({ field }) => (
            <DateField
              label={t("web.auth.birthDate")}
              hint={t("web.auth.birthDateHint")}
              error={fieldError("birthDate")}
              value={field.value}
              onChange={field.onChange}
              minimumDate={BIRTH_DATE_START}
              maximumDate={BIRTH_DATE_END}
              defaultDate={BIRTH_DATE_DEFAULT}
            />
          )}
        />
        <Controller
          control={control}
          name="acceptedTerms"
          render={({ field }) => (
            <View style={styles.terms}>
              <Checkbox
                isChecked={field.value}
                onChange={field.onChange}
                isInvalid={Boolean(errors.acceptedTerms)}
              >
                <AppText>
                  {t("web.auth.acceptTermsBefore")}{" "}
                  <TextLink onPress={() => openLegalPage("terms")}>
                    {t("web.auth.acceptTermsTerms")}
                  </TextLink>
                  ,{" "}
                  <TextLink onPress={() => openLegalPage("privacy")}>
                    {t("web.auth.acceptTermsPrivacy")}
                  </TextLink>{" "}
                  {t("web.auth.acceptTermsAnd")}{" "}
                  <TextLink onPress={() => openLegalPage("guidelines")}>
                    {t("web.auth.acceptTermsGuidelines")}
                  </TextLink>
                  .
                </AppText>
              </Checkbox>
              {errors.acceptedTerms ? (
                <AppText variant="caption" tone="danger">
                  {t("web.validation.terms")}
                </AppText>
              ) : null}
            </View>
          )}
        />
        <Button
          size="lg"
          isBlock
          label={t("web.common.continue")}
          isLoading={isSubmitting}
          onPress={() => void handleSubmit(onSubmit)()}
        />
      </View>
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  form: { gap: space.xl },
  terms: { gap: space.xs },
})
