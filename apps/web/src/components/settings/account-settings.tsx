"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { changePasswordInputSchema, type ChangePasswordInput } from "@ponto/validation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Laptop } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { PasswordInput } from "@/components/auth/password-input"
import { RelativeTime } from "@/components/post/relative-time"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { SettingsSection } from "@/components/settings/settings-section"
import { Chip } from "@/components/ui/badges"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { errorMessage } from "@/lib/api-errors"
import { queryKeys } from "@/lib/query-keys"

export function AccountSettings(): React.JSX.Element {
  return (
    <>
      <EmailSection />
      <PasswordSection />
      <SessionsSection />
    </>
  )
}

function EmailSection(): React.JSX.Element | null {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()

  const resend = useMutation({
    mutationFn: () => api.auth.resendEmailVerification(),
    onSuccess: () => toast.success(t("web.settings.verificationSent")),
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  if (!viewer) return null

  return (
    <SettingsSection title={t("web.settings.email")}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-medium">{viewer.email}</span>
        <Chip tone={viewer.isEmailVerified ? "success" : "warning"}>
          {viewer.isEmailVerified
            ? t("web.settings.emailVerified")
            : t("web.settings.emailNotVerified")}
        </Chip>
        {viewer.isEmailVerified ? null : (
          <Button
            variant="secondary"
            size="sm"
            isLoading={resend.isPending}
            onClick={() => resend.mutate()}
          >
            {t("web.settings.resendVerification")}
          </Button>
        )}
      </div>
    </SettingsSection>
  )
}

function PasswordSection(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const queryClient = useQueryClient()

  const { register, handleSubmit, reset, formState } = useForm<ChangePasswordInput>({
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
      <form
        noValidate
        onSubmit={(event) => void handleSubmit((input) => change.mutate(input))(event)}
        className="flex flex-col gap-5"
      >
        <Field
          label={t("web.settings.currentPassword")}
          error={formState.errors.currentPassword ? t("web.validation.required") : undefined}
        >
          {({ id, isInvalid }) => (
            <PasswordInput
              id={id}
              autoComplete="current-password"
              aria-invalid={isInvalid}
              {...register("currentPassword")}
            />
          )}
        </Field>
        <Field
          label={t("web.auth.newPassword")}
          hint={t("web.auth.passwordHint")}
          error={formState.errors.newPassword ? t("web.validation.passwordLength") : undefined}
        >
          {({ id, describedBy, isInvalid }) => (
            <PasswordInput
              id={id}
              autoComplete="new-password"
              aria-describedby={describedBy}
              aria-invalid={isInvalid}
              {...register("newPassword")}
            />
          )}
        </Field>
        <Button type="submit" className="self-end" isLoading={change.isPending}>
          {t("web.common.save")}
        </Button>
      </form>
    </SettingsSection>
  )
}

function SessionsSection(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
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
      <ul className="flex flex-col">
        {list.map((session) => (
          <li
            key={session.id}
            className="flex items-center gap-3 border-t border-line py-3 first:border-t-0"
          >
            <Laptop aria-hidden className="size-5 flex-none text-muted" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {session.userAgent ?? t("web.settings.unknownDevice")}
              </span>
              <span className="text-[13px] text-subtle">
                {session.isCurrent ? (
                  t("web.settings.thisDevice")
                ) : (
                  <RelativeTime value={session.lastUsedAt} />
                )}
              </span>
            </div>
            {session.isCurrent ? null : (
              <Button variant="ghost" size="sm" onClick={() => revoke.mutate(session.id)}>
                {t("web.settings.endSession")}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {list.length > 1 ? (
        <Button
          variant="secondary"
          className="self-start"
          isLoading={revokeOthers.isPending}
          onClick={() => revokeOthers.mutate()}
        >
          {t("web.settings.endOtherSessions")}
        </Button>
      ) : null}
    </SettingsSection>
  )
}
