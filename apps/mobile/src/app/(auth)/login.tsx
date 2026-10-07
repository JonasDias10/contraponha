import { errorMessage } from "@contraponha/client-core"
import { loginInputSchema, type LoginInput } from "@contraponha/validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { StyleSheet, View } from "react-native"

import { AuthScreen } from "@/components/auth/auth-screen"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { TextLink } from "@/components/ui/text-link"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useSession } from "@/providers/session-provider"
import { space } from "@/lib/theme"

export default function LoginScreen(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const { signIn } = useSession()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: LoginInput): Promise<void> => {
    setServerError(null)

    try {
      const auth = await api.auth.login(values)

      await signIn(auth)
    } catch (error) {
      setServerError(errorMessage({ error, t }))
    }
  }

  return (
    <AuthScreen
      title={t("web.auth.signInTitle")}
      lead={
        <AppText tone="muted">
          {t("web.auth.noAccount")}{" "}
          <TextLink href="/signup" isReplace>
            {t("web.auth.createAccount")}
          </TextLink>
        </AppText>
      }
    >
      <View style={styles.form}>
        {serverError ? <Banner tone="danger">{serverError}</Banner> : null}
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label={t("web.auth.email")}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              error={errors.email ? t("web.validation.email") : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <TextField
              label={t("web.auth.password")}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              isPassword
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void handleSubmit(onSubmit)()}
              error={errors.password ? t("web.validation.required") : undefined}
            />
          )}
        />
        <TextLink href="/forgot-password" style={styles.forgot}>
          {t("web.auth.forgotPassword")}
        </TextLink>
        <Button
          size="lg"
          isBlock
          label={t("web.auth.signIn")}
          isLoading={isSubmitting}
          onPress={() => void handleSubmit(onSubmit)()}
        />
      </View>
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  form: { gap: space.xl },
  forgot: { alignSelf: "flex-end" },
})
