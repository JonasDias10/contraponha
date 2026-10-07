import { errorMessage, queryKeys } from "@contraponha/client-core"
import { changePasswordInputSchema, type ChangePasswordInput } from "@contraponha/validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Laptop, LogOut } from "lucide-react-native"
import { Controller, useForm } from "react-hook-form"
import { Alert, StyleSheet, View } from "react-native"

import { RelativeTime } from "@/components/post/relative-time"
import { SettingsScreen } from "@/components/settings/settings-screen"
import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Divider } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useRequiredViewer, useSession } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"
import { space } from "@/lib/theme"

function EmailSection(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useRequiredViewer()
  const toast = useToast()

  const resend = useMutation({
    mutationFn: () => api.auth.resendEmailVerification(),
    onSuccess: () => toast.success(t("web.settings.verificationSent")),
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  return (
    <SettingsSection title={t("web.settings.email")}>
      <View style={styles.row}>
        <AppText variant="bodyStrong" style={styles.flex}>
          {viewer.email}
        </AppText>
        <Chip
          tone={viewer.isEmailVerified ? "success" : "warning"}
          label={
            viewer.isEmailVerified
              ? t("web.settings.emailVerified")
              : t("web.settings.emailNotVerified")
          }
        />
      </View>
      {viewer.isEmailVerified ? null : (
        <Button
          variant="secondary"
          label={t("web.settings.resendVerification")}
          isLoading={resend.isPending}
          onPress={() => resend.mutate()}
        />
      )}
    </SettingsSection>
  )
}

function PasswordSection(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { control, handleSubmit, reset, formState } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordInputSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  })

  const change = useMutation({
    mutationFn: (input: ChangePasswordInput) => api.auth.changePassword(input),
    onSuccess: async () => {
      reset()

      toast.success(t("web.settings.passwordChanged"))

      await queryClient.invalidateQueries({ queryKey: queryKeys.sessions })
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  return (
    <SettingsSection title={t("web.settings.changePassword")}>
      <Controller
        control={control}
        name="currentPassword"
        render={({ field }) => (
          <TextField
            label={t("web.settings.currentPassword")}
            value={field.value}
            onChangeText={field.onChange}
            isPassword
            autoComplete="current-password"
            textContentType="password"
            error={formState.errors.currentPassword ? t("web.validation.required") : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="newPassword"
        render={({ field }) => (
          <TextField
            label={t("web.auth.newPassword")}
            hint={t("web.auth.passwordHint")}
            value={field.value}
            onChangeText={field.onChange}
            isPassword
            autoComplete="new-password"
            textContentType="newPassword"
            error={formState.errors.newPassword ? t("web.validation.passwordLength") : undefined}
          />
        )}
      />
      <Button
        isBlock
        label={t("web.common.save")}
        isLoading={change.isPending}
        onPress={() => void handleSubmit((input) => change.mutate(input))()}
      />
    </SettingsSection>
  )
}

function SessionsSection(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const toast = useToast()
  const palette = usePalette()
  const queryClient = useQueryClient()

  const sessions = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: () => api.auth.listSessions(),
  })

  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.sessions })

  const revoke = useMutation({
    mutationFn: (sessionId: string) => api.auth.revokeSession(sessionId),
    onSettled: refresh,
  })

  const revokeOthers = useMutation({
    mutationFn: () => api.auth.revokeOtherSessions(),
    onSuccess: () => toast.success(t("web.settings.sessionsEnded")),
    onSettled: refresh,
  })

  const list = sessions.data ?? []

  return (
    <SettingsSection title={t("web.settings.sessions")}>
      {list.map((session, index) => (
        <View key={session.id}>
          {index > 0 ? <Divider style={styles.divider} /> : null}
          <View style={styles.row}>
            <Laptop size={20} color={palette.muted} />
            <View style={styles.flex}>
              <AppText variant="smallStrong" numberOfLines={1}>
                {session.userAgent ?? t("web.settings.unknownDevice")}
              </AppText>
              {session.isCurrent ? (
                <AppText variant="caption" tone="subtle">
                  {t("web.settings.thisDevice")}
                </AppText>
              ) : (
                <RelativeTime value={session.lastUsedAt} variant="caption" tone="subtle" />
              )}
            </View>
            {session.isCurrent ? null : (
              <Button
                variant="ghost"
                size="sm"
                label={t("web.settings.endSession")}
                onPress={() => revoke.mutate(session.id)}
              />
            )}
          </View>
        </View>
      ))}
      {list.length > 1 ? (
        <Button
          variant="secondary"
          label={t("web.settings.endOtherSessions")}
          isLoading={revokeOthers.isPending}
          onPress={() => revokeOthers.mutate()}
        />
      ) : null}
    </SettingsSection>
  )
}

function SignOutSection(): React.JSX.Element {
  const { t } = useI18n()
  const { signOut } = useSession()

  return (
    <SettingsSection title={t("web.settings.signOutTitle")} lead={t("web.settings.signOutLead")}>
      <Button
        variant="secondary"
        isBlock
        icon={LogOut}
        label={t("web.nav.signOut")}
        onPress={() =>
          Alert.alert(t("web.settings.signOutTitle"), t("web.settings.signOutLead"), [
            { text: t("web.common.cancel"), style: "cancel" },
            { text: t("web.nav.signOut"), style: "destructive", onPress: () => void signOut() },
          ])
        }
      />
    </SettingsSection>
  )
}

export default function AccountSettingsScreen(): React.JSX.Element {
  const { t } = useI18n()

  return (
    <SettingsScreen title={t("web.settings.account")}>
      <EmailSection />
      <PasswordSection />
      <SessionsSection />
      <SignOutSection />
    </SettingsScreen>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  flex: { flex: 1 },
  divider: { marginBottom: space.md },
})
