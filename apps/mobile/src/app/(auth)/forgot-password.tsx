import { errorMessage } from "@contraponha/client-core"
import {
  requestPasswordResetInputSchema,
  type RequestPasswordResetInput,
} from "@contraponha/validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Controller, useForm } from "react-hook-form"
import { StyleSheet, View } from "react-native"

import { AuthScreen } from "@/components/auth/auth-screen"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/ui/surfaces"
import { TextField } from "@/components/ui/text-field"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { space } from "@/lib/theme"

// Always answers the same way, so the form never reveals whether an account exists.
export default function ForgotPasswordScreen(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  const mutation = useMutation({
    mutationFn: (input: RequestPasswordResetInput) => api.auth.requestPasswordReset(input),
  })

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetInputSchema),
    defaultValues: { email: "" },
  })

  return (
    <AuthScreen title={t("web.auth.forgotTitle")} lead={t("web.auth.forgotLead")}>
      {mutation.isSuccess ? (
        <Banner tone="info">{t("web.auth.forgotSent")}</Banner>
      ) : (
        <View style={styles.form}>
          {mutation.isError ? (
            <Banner tone="danger">{errorMessage({ error: mutation.error, t })}</Banner>
          ) : null}
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                label={t("web.auth.email")}
                error={errors.email ? t("web.validation.email") : undefined}
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
          <Button
            size="lg"
            isBlock
            label={t("web.auth.forgotSend")}
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
