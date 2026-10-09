"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { PrivateProfile } from "@contraponha/types"
import {
  BIO_MAX_LENGTH,
  HEADLINE_MAX_LENGTH,
  LOCATION_MAX_LENGTH,
  PRONOUNS_MAX_LENGTH,
} from "@contraponha/validation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import {
  errorMessage,
  profileFormSchema,
  profileFormValuesFrom,
  queryKeys,
  type ProfileFormOutput,
  type ProfileFormValues,
} from "@contraponha/client-core"

import { Button, Field, Input, Textarea, useApi, useI18n, useViewer } from "@contraponha/web-ui"
import { ProfilePhotoField } from "@/components/settings/profile-photo-field"
import { SettingsSection } from "@/components/settings/settings-section"

export function ProfileSettings(): React.JSX.Element | null {
  const viewer = useViewer()

  if (!viewer) return null

  return <ProfileForm viewer={viewer} />
}

interface ProfileFormProps {
  viewer: PrivateProfile
}

function ProfileForm({ viewer }: ProfileFormProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const queryClient = useQueryClient()

  const { control, register, handleSubmit, reset, formState } = useForm<
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
    <SettingsSection title={t("web.settings.profileTitle")} lead={t("web.settings.profileLead")}>
      <ProfilePhotoField viewer={viewer} />
      <form
        noValidate
        onSubmit={(event) => void handleSubmit((values) => save.mutate(values))(event)}
        className="flex flex-col gap-5"
      >
        <Field
          label={t("web.settings.displayName")}
          error={errors.displayName ? t("web.validation.required") : undefined}
        >
          {({ id, isInvalid }) => (
            <Input
              id={id}
              autoComplete="name"
              aria-invalid={isInvalid}
              {...register("displayName")}
            />
          )}
        </Field>
        <Field
          label={t("web.settings.headline")}
          hint={t("web.settings.headlineHint")}
          error={errors.headline ? t("web.validation.tooLong") : undefined}
        >
          {({ id, describedBy, isInvalid }) => (
            <Input
              id={id}
              maxLength={HEADLINE_MAX_LENGTH}
              aria-describedby={describedBy}
              aria-invalid={isInvalid}
              {...register("headline")}
            />
          )}
        </Field>
        <Field
          label={t("web.settings.bio")}
          hint={t("web.settings.bioCount", { count: bio.length, max: BIO_MAX_LENGTH })}
          error={errors.bio ? t("web.validation.tooLong") : undefined}
        >
          {({ id, describedBy, isInvalid }) => (
            <Textarea
              id={id}
              maxLength={BIO_MAX_LENGTH}
              aria-describedby={describedBy}
              aria-invalid={isInvalid}
              {...register("bio")}
            />
          )}
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t("web.settings.location")}>
            {({ id }) => (
              <Input id={id} maxLength={LOCATION_MAX_LENGTH} {...register("location")} />
            )}
          </Field>
          <Field label={t("web.settings.pronouns")} hint={t("web.settings.pronounsHint")}>
            {({ id, describedBy }) => (
              <Input
                id={id}
                maxLength={PRONOUNS_MAX_LENGTH}
                aria-describedby={describedBy}
                {...register("pronouns")}
              />
            )}
          </Field>
        </div>
        <Field
          label={t("web.settings.website")}
          error={errors.website ? t("web.validation.url") : undefined}
        >
          {({ id, isInvalid }) => (
            <Input
              id={id}
              type="url"
              placeholder="https://"
              aria-invalid={isInvalid}
              {...register("website")}
            />
          )}
        </Field>
        <Button
          type="submit"
          className="self-end"
          isLoading={save.isPending}
          disabled={!formState.isDirty}
        >
          {t("web.common.save")}
        </Button>
      </form>
    </SettingsSection>
  )
}
