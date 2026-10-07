import {
  errorMessage,
  profileFormSchema,
  profileFormValuesFrom,
  queryKeys,
  type ProfileFormOutput,
  type ProfileFormValues,
} from "@contraponha/client-core"
import {
  BIO_MAX_LENGTH,
  HEADLINE_MAX_LENGTH,
  LOCATION_MAX_LENGTH,
  PRONOUNS_MAX_LENGTH,
} from "@contraponha/validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, useForm, useWatch } from "react-hook-form"

import { SettingsScreen } from "@/components/settings/settings-screen"
import { SettingsSection } from "@/components/settings/settings-section"
import { Button } from "@/components/ui/button"
import { TextField } from "@/components/ui/text-field"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useRequiredViewer } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"

export default function ProfileSettingsScreen(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useRequiredViewer()
  const toast = useToast()
  const queryClient = useQueryClient()

  const { control, handleSubmit, reset, formState } = useForm<
    ProfileFormValues,
    unknown,
    ProfileFormOutput
  >({
    resolver: zodResolver(profileFormSchema),
    defaultValues: profileFormValuesFrom(viewer),
  })

  const bio = useWatch({ control, name: "bio" })

  const save = useMutation({
    mutationFn: (values: ProfileFormOutput) => api.users.updateMe(values),
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKeys.me, updated)

      reset(profileFormValuesFrom(updated))

      toast.success(t("web.settings.profileSaved"))

      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(updated.handle) })
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const { errors } = formState

  return (
    <SettingsScreen title={t("web.settings.profile")}>
      <SettingsSection title={t("web.settings.profileTitle")} lead={t("web.settings.profileLead")}>
        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <TextField
              label={t("web.settings.displayName")}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              autoComplete="name"
              error={errors.displayName ? t("web.validation.required") : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name="headline"
          render={({ field }) => (
            <TextField
              label={t("web.settings.headline")}
              hint={t("web.settings.headlineHint")}
              value={field.value}
              onChangeText={field.onChange}
              maxLength={HEADLINE_MAX_LENGTH}
              error={errors.headline ? t("web.validation.tooLong") : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name="bio"
          render={({ field }) => (
            <TextField
              label={t("web.settings.bio")}
              hint={t("web.settings.bioCount", { count: bio.length, max: BIO_MAX_LENGTH })}
              value={field.value}
              onChangeText={field.onChange}
              maxLength={BIO_MAX_LENGTH}
              multiline
              error={errors.bio ? t("web.validation.tooLong") : undefined}
            />
          )}
        />
        <Controller
          control={control}
          name="location"
          render={({ field }) => (
            <TextField
              label={t("web.settings.location")}
              value={field.value}
              onChangeText={field.onChange}
              maxLength={LOCATION_MAX_LENGTH}
            />
          )}
        />
        <Controller
          control={control}
          name="pronouns"
          render={({ field }) => (
            <TextField
              label={t("web.settings.pronouns")}
              hint={t("web.settings.pronounsHint")}
              value={field.value}
              onChangeText={field.onChange}
              maxLength={PRONOUNS_MAX_LENGTH}
            />
          )}
        />
        <Controller
          control={control}
          name="website"
          render={({ field }) => (
            <TextField
              label={t("web.settings.website")}
              placeholder="https://"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              keyboardType="url"
              error={errors.website ? t("web.validation.url") : undefined}
            />
          )}
        />
        <Button
          isBlock
          label={t("web.common.save")}
          isLoading={save.isPending}
          disabled={!formState.isDirty}
          onPress={() => void handleSubmit((values) => save.mutate(values))()}
        />
      </SettingsSection>
    </SettingsScreen>
  )
}
