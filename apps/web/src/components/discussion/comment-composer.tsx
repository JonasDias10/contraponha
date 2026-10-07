"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { commentBodySchema, httpUrlSchema } from "@ponto/validation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { BookText } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input, Textarea } from "@/components/ui/field"
import { Card } from "@/components/ui/surfaces"
import { errorMessage } from "@/lib/api-errors"
import { queryKeys } from "@/lib/query-keys"

const commentFormSchema = z.object({
  body: commentBodySchema,
  sourceUrl: z.union([httpUrlSchema, z.literal("")]),
})

type CommentValues = z.input<typeof commentFormSchema>

export interface CommentComposerProps {
  postId: string
  parentId?: string
  autoFocus?: boolean
  onDone?: () => void
}

export function CommentComposer({
  postId,
  parentId,
  autoFocus = false,
  onDone,
}: CommentComposerProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const queryClient = useQueryClient()
  const [isSourceOpen, setIsSourceOpen] = useState(false)

  const { control, register, handleSubmit, reset, formState } = useForm<CommentValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { body: "", sourceUrl: "" },
  })

  const body = useWatch({ control, name: "body" })

  const mutation = useMutation({
    mutationFn: ({ body, sourceUrl }: CommentValues) =>
      api.comments.create({
        postId,
        input: { body, parentId, sources: sourceUrl ? [{ url: sourceUrl }] : [] },
      }),
    onSuccess: async () => {
      reset()

      setIsSourceOpen(false)

      onDone?.()

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.commentsOfPost(postId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.post(postId) }),
        ...(parentId
          ? [queryClient.invalidateQueries({ queryKey: queryKeys.replies(parentId) })]
          : []),
      ])
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  if (!viewer) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-muted">{t("web.post.signInToContribute")}</p>
        <Button asChild size="sm">
          <Link href="/login">{t("web.nav.signIn")}</Link>
        </Button>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <form
        noValidate
        onSubmit={(event) => void handleSubmit((values) => mutation.mutate(values))(event)}
        className="flex flex-col gap-3"
      >
        <div className="flex items-start gap-3">
          <Avatar id={viewer.id} name={viewer.displayName} size="sm" />
          <label className="flex-1">
            <span className="sr-only">
              {parentId ? t("web.comment.replyPlaceholder") : t("web.post.composerPlaceholder")}
            </span>
            <Textarea
              autoFocus={autoFocus}
              rows={2}
              placeholder={
                parentId ? t("web.comment.replyPlaceholder") : t("web.post.composerPlaceholder")
              }
              className="min-h-18 border-0 bg-transparent px-0 py-1.5 font-serif text-base focus-visible:outline-none"
              aria-invalid={Boolean(formState.errors.body)}
              {...register("body")}
            />
          </label>
        </div>
        {isSourceOpen ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold">{t("web.composer.sourceUrl")}</span>
            <Input
              type="url"
              placeholder="https://"
              aria-invalid={Boolean(formState.errors.sourceUrl)}
              {...register("sourceUrl")}
            />
            {formState.errors.sourceUrl ? (
              <span role="alert" className="text-[13px] text-danger">
                {t("web.validation.url")}
              </span>
            ) : null}
          </label>
        ) : null}
        <div className="flex justify-end gap-2">
          {isSourceOpen ? null : (
            <Button variant="ghost" size="sm" onClick={() => setIsSourceOpen(true)}>
              <BookText aria-hidden className="size-4" />
              {t("web.post.composerSource")}
            </Button>
          )}
          <Button type="submit" size="sm" disabled={!body.trim()} isLoading={mutation.isPending}>
            {parentId ? t("web.comment.reply") : t("web.post.composerSubmit")}
          </Button>
        </div>
      </form>
    </Card>
  )
}
