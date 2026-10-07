"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { PostView } from "@contraponha/types"
import { contextNoteInputSchema, httpUrlSchema } from "@contraponha/validation"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Field, Input, Textarea } from "@/components/ui/field"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/overlays"
import { useContextNoteMutation } from "@/hooks/use-moderation"

const contextNoteFormSchema = contextNoteInputSchema.pick({ body: true }).extend({
  sourceUrl: z.union([httpUrlSchema, z.literal("")]),
})

type ContextNoteValues = z.input<typeof contextNoteFormSchema>

export interface ContextNoteDialogProps {
  post: PostView
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContextNoteDialog({
  post,
  open,
  onOpenChange,
}: ContextNoteDialogProps): React.JSX.Element {
  const { t } = useI18n()
  const mutation = useContextNoteMutation()

  const {
    register,
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

    mutation.mutate(
      { postId: post.id, input: { body, sources } },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("web.common.close")}>
        <DialogTitle className="font-serif text-[25px] font-semibold">
          {t("web.moderation.contextTitle")}
        </DialogTitle>
        <form
          noValidate
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          className="flex flex-col gap-5"
        >
          <Field
            label={t("web.moderation.contextBody")}
            error={errors.body ? t("web.validation.required") : undefined}
          >
            {({ id, isInvalid }) => (
              <Textarea id={id} aria-invalid={isInvalid} {...register("body")} />
            )}
          </Field>
          <Field
            label={t("web.composer.sourceUrl")}
            error={errors.sourceUrl ? t("web.validation.url") : undefined}
          >
            {({ id, isInvalid }) => (
              <Input id={id} type="url" aria-invalid={isInvalid} {...register("sourceUrl")} />
            )}
          </Field>
          <div className="flex flex-wrap justify-end gap-3">
            {post.contextNote ? (
              <Button
                variant="dangerOutline"
                onClick={() =>
                  mutation.mutate(
                    { postId: post.id, input: null },
                    { onSuccess: () => onOpenChange(false) },
                  )
                }
              >
                {t("web.moderation.removeContext")}
              </Button>
            ) : null}
            <Button type="submit" isLoading={mutation.isPending}>
              {t("web.common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
