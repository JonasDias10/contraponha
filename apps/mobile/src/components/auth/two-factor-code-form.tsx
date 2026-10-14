import { twoFactorCodeSchema } from "@contraponha/validation"
import { useState } from "react"
import { StyleSheet, View } from "react-native"

import { Button } from "@/components/ui/button"
import { Banner } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { useI18n } from "@/providers/i18n-provider"
import { space } from "@/lib/theme"

export interface TwoFactorCodeFormProps {
  // Resolves to an error message to show, or null when the code was accepted.
  onSubmit: (code: string) => Promise<string | null>
}

export function TwoFactorCodeForm({ onSubmit }: TwoFactorCodeFormProps): React.JSX.Element {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isValid = twoFactorCodeSchema.safeParse(code).success

  const handleSubmit = async (): Promise<void> => {
    setIsSubmitting(true)

    const message = await onSubmit(code)

    setIsSubmitting(false)

    setError(message)
  }

  return (
    <View style={styles.form}>
      <View style={styles.header}>
        <AppText variant="heading2" accessibilityRole="header">
          {t("web.twoFactor.loginTitle")}
        </AppText>
        <AppText tone="muted">{t("web.twoFactor.loginLead")}</AppText>
      </View>
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <TextField
        label={t("web.twoFactor.codeOrRecovery")}
        value={code}
        onChangeText={setCode}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      <Button
        size="lg"
        isBlock
        label={t("web.twoFactor.verify")}
        disabled={!isValid}
        isLoading={isSubmitting}
        onPress={() => void handleSubmit()}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: space.xl },
  header: { gap: space.xs },
})
