import { useTwoFactorSettings } from "@contraponha/client-core/react"
import type { TwoFactorSetup } from "@contraponha/types"
import { twoFactorCodeSchema } from "@contraponha/validation"
import * as Clipboard from "expo-clipboard"
import { useState } from "react"
import { Linking, Platform, Share, StyleSheet, View } from "react-native"

import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useToast } from "@/providers/toast-provider"
import { radius, space } from "@/lib/theme"

type Pending = "disable" | "regenerate" | null

export function TwoFactorSection(): React.JSX.Element {
  const { t } = useI18n()
  const twoFactor = useTwoFactorSettings()
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [pending, setPending] = useState<Pending>(null)
  const status = twoFactor.status
  const setup = twoFactor.setup.data

  const content = (): React.ReactNode => {
    if (recoveryCodes)
      return <RecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />

    if (status?.isEnabled && pending) {
      return (
        <CodePrompt
          label={t("web.twoFactor.codeOrRecovery")}
          submitLabel={
            pending === "disable" ? t("web.twoFactor.disable") : t("web.twoFactor.regenerate")
          }
          isPending={twoFactor.disable.isPending || twoFactor.regenerate.isPending}
          onCancel={() => setPending(null)}
          onSubmit={(code) => {
            if (pending === "disable") {
              twoFactor.disable.mutate({ code }, { onSuccess: () => setPending(null) })

              return
            }

            twoFactor.regenerate.mutate(
              { code },
              {
                onSuccess: ({ codes }) => {
                  setPending(null)

                  setRecoveryCodes(codes)
                },
              },
            )
          }}
        />
      )
    }

    if (status?.isEnabled) {
      return (
        <View style={styles.stack}>
          <View style={styles.row}>
            <Chip label={t("web.twoFactor.on")} />
            <AppText variant="small" tone="muted">
              {t("web.twoFactor.codesLeft", { count: status.recoveryCodesLeft })}
            </AppText>
          </View>
          <View style={styles.row}>
            <Button
              size="sm"
              variant="secondary"
              label={t("web.twoFactor.regenerate")}
              onPress={() => setPending("regenerate")}
            />
            <Button
              size="sm"
              variant="danger"
              label={t("web.twoFactor.disable")}
              onPress={() => setPending("disable")}
            />
          </View>
        </View>
      )
    }

    if (setup) {
      return (
        <SetupSteps
          setup={setup}
          isPending={twoFactor.enable.isPending}
          onConfirm={(code) =>
            twoFactor.enable.mutate({ code }, { onSuccess: ({ codes }) => setRecoveryCodes(codes) })
          }
        />
      )
    }

    return (
      <Button
        label={t("web.twoFactor.start")}
        isLoading={twoFactor.setup.isPending}
        onPress={() => twoFactor.setup.mutate()}
      />
    )
  }

  return (
    <SettingsSection title={t("web.twoFactor.title")} lead={t("web.twoFactor.lead")}>
      {content()}
    </SettingsSection>
  )
}

interface SetupStepsProps {
  setup: TwoFactorSetup
  isPending: boolean
  onConfirm: (code: string) => void
}

// On the phone itself the authenticator opens through the otpauth:// link; the key can
// also be copied by hand.
function SetupSteps({ setup, isPending, onConfirm }: SetupStepsProps): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const toast = useToast()

  return (
    <View style={styles.stack}>
      <Button
        variant="secondary"
        label={t("web.twoFactor.openApp")}
        onPress={() => void Linking.openURL(setup.otpauthUrl)}
      />
      <AppText variant="small" tone="muted">
        {t("web.twoFactor.manualKey")}
      </AppText>
      <AppText
        selectable
        onPress={() =>
          void Clipboard.setStringAsync(setup.secret).then(() =>
            toast.show(t("web.twoFactor.keyCopied")),
          )
        }
        style={[styles.code, { backgroundColor: palette.surfaceSunken }]}
      >
        {setup.secret}
      </AppText>
      <CodePrompt
        label={t("web.twoFactor.code")}
        submitLabel={t("web.twoFactor.confirm")}
        isPending={isPending}
        onSubmit={onConfirm}
      />
    </View>
  )
}

interface CodePromptProps {
  label: string
  submitLabel: string
  isPending: boolean
  onSubmit: (code: string) => void
  onCancel?: () => void
}

function CodePrompt({
  label,
  submitLabel,
  isPending,
  onSubmit,
  onCancel,
}: CodePromptProps): React.JSX.Element {
  const { t } = useI18n()
  const [code, setCode] = useState("")
  const isValid = twoFactorCodeSchema.safeParse(code).success

  return (
    <View style={styles.stack}>
      <TextField
        label={label}
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
      />
      <View style={styles.row}>
        <Button
          size="sm"
          label={submitLabel}
          disabled={!isValid}
          isLoading={isPending}
          onPress={() => onSubmit(code)}
        />
        {onCancel ? (
          <Button size="sm" variant="ghost" label={t("web.common.cancel")} onPress={onCancel} />
        ) : null}
      </View>
    </View>
  )
}

interface RecoveryCodesProps {
  codes: string[]
  onDone: () => void
}

function RecoveryCodes({ codes, onDone }: RecoveryCodesProps): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const text = codes.join("\n")

  return (
    <View style={styles.stack}>
      <AppText variant="bodyStrong">{t("web.twoFactor.recoveryTitle")}</AppText>
      <AppText variant="small" tone="muted">
        {t("web.twoFactor.recoveryLead")}
      </AppText>
      <AppText selectable style={[styles.code, { backgroundColor: palette.surfaceSunken }]}>
        {text}
      </AppText>
      <View style={styles.row}>
        <Button
          size="sm"
          variant="secondary"
          label={t("web.twoFactor.downloadCodes")}
          onPress={() => void Share.share({ message: text })}
        />
        <Button size="sm" label={t("web.twoFactor.savedCodes")} onPress={onDone} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  stack: { gap: space.md },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
  code: {
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    padding: space.md,
    borderRadius: radius.md,
    lineHeight: 22,
  },
})
