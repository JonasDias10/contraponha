import { useContextNoteMutation } from "@contraponha/client-core/react"
import type { PostView } from "@contraponha/types"
import { contextNoteInputSchema, httpUrlSchema } from "@contraponha/validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Sheet } from "@/components/ui/sheet"
import { TextField } from "@/components/ui/text-field"
import { useI18n } from "@/providers/i18n-provider"

const contextNoteFormSchema = contextNoteInputSchema.pick({ body: true }).extend({
  sourceUrl: z.union([httpUrlSchema, z.literal("")]),
})

type ContextNoteValues = z.input<typeof contextNoteFormSchema>

export interface ContextNoteSheetProps {
  post: PostView
  isOpen: boolean
  onClose: () => void
}

export function ContextNoteSheet({
  post,
  isOpen,
  onClose,
}: ContextNoteSheetProps): React.JSX.Element {
  const { t } = useI18n()
  const mutation = useContextNoteMutation()

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ContextNoteValues>({
    resolver: zodResolver(contextNoteFormSchema),
    defaultValues: {
      body: post.contextNote?.body ?? "",
      sourceUrl: post.contextNote?.sources[0]?.url ?? "",
    },
  })

  const onSubmit = ({ body, sourceUrl }: ContextNoteValues): void => {
    const sources = sourceUrl ? [{ url: sourceUrl }] : []

    mutation.mutate({ postId: post.id, input: { body, sources } }, { onSuccess: onClose })
  }

  return (
    <Sheet
      isOpen={isOpen}
      title={t("web.moderation.contextTitle")}
      onClose={onClose}
      footer={
        <>
          {post.contextNote ? (
            <Button
              variant="ghost"
              label={t("web.moderation.removeContext")}
              onPress={() =>
                mutation.mutate({ postId: post.id, input: null }, { onSuccess: onClose })
              }
            />
          ) : null}
          <Button
            label={t("web.common.save")}
            isLoading={mutation.isPending}
            onPress={() => void handleSubmit(onSubmit)()}
          />
        </>
      }
    >
      <Controller
        control={control}
        name="body"
        render={({ field }) => (
          <TextField
            label={t("web.moderation.contextBody")}
            error={errors.body ? t("web.validation.required") : undefined}
            value={field.value}
            onChangeText={field.onChange}
            multiline
          />
        )}
      />
      <Controller
        control={control}
        name="sourceUrl"
        render={({ field }) => (
          <TextField
            label={t("web.composer.sourceUrl")}
            error={errors.sourceUrl ? t("web.validation.url") : undefined}
            value={field.value}
            onChangeText={field.onChange}
            autoCapitalize="none"
            keyboardType="url"
          />
        )}
      />
    </Sheet>
  )
}
