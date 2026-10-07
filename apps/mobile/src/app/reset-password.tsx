import { errorMessage } from "@contraponha/client-core"
import { resetPasswordInputSchema } from "@contraponha/validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { router, useLocalSearchParams } from "expo-router"
import { Controller, useForm, useWatch } from "react-hook-form"
import { StyleSheet, View } from "react-native"
import type { z } from "zod"

import { AuthScreen } from "@/components/auth/auth-screen"
import { PasswordStrengthMeter } from "@/components/auth/password-strength-meter"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/ui/surfaces"
import { TextField } from "@/components/ui/text-field"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useSession } from "@/providers/session-provider"
import { space } from "@/lib/theme"

const resetPasswordFormSchema = resetPasswordInputSchema.pick({ newPassword: true })

type ResetPasswordValues = z.input<typeof resetPasswordFormSchema>

export default function ResetPasswordScreen(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const { isSignedIn, signOut } = useSession()
  const { token } = useLocalSearchParams<{ token?: string }>()

  const mutation = useMutation({
    mutationFn: ({ newPassword }: ResetPasswordValues) =>
      api.auth.resetPassword({ token: token ?? "", newPassword }),
    onSuccess: () => {
      if (isSignedIn) void signOut()
    },
  })

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { newPassword: "" },
  })

  const newPassword = useWatch({ control, name: "newPassword" })

  if (!token) {
    return (
      <AuthScreen title={t("web.auth.resetTitle")}>
        <Banner tone="danger">{t("web.auth.linkInvalid")}</Banner>
      </AuthScreen>
    )
  }

  return (
    <AuthScreen title={t("web.auth.resetTitle")} lead={t("web.auth.resetLead")}>
      {mutation.isSuccess ? (
        <View style={styles.form}>
          <Banner tone="info">{t("web.auth.resetDone")}</Banner>
          <Button isBlock label={t("web.auth.signIn")} onPress={() => router.replace("/login")} />
        </View>
      ) : (
        <View style={styles.form}>
          {mutation.isError ? (
            <Banner tone="danger">{errorMessage({ error: mutation.error, t })}</Banner>
          ) : null}
          <Controller
            control={control}
            name="newPassword"
            render={({ field }) => (
              <TextField
                label={t("web.auth.newPassword")}
                hint={t("web.auth.passwordHint")}
                error={errors.newPassword ? t("web.validation.passwordLength") : undefined}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                isPassword
                autoComplete="new-password"
                textContentType="newPassword"
              />
            )}
          />
          <PasswordStrengthMeter password={newPassword} />
          <Button
            size="lg"
            isBlock
            label={t("web.auth.resetSave")}
            isLoading={mutation.isPending}
            onPress={() => void handleSubmit((values) => mutation.mutate(values))()}
          />
        </View>
      )}
    </AuthScreen>
  )
}

const styles = StyleSheet.create({
  form: { gap: space.xl },
})
