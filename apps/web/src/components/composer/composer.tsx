"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import type { PostView } from "@contraponha/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, ImagePlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import {
  composerDraftSchema,
  type ComposerOutput,
  composerSchema,
  type ComposerValues,
  EMPTY_COMPOSER,
  errorMessage,
  filledSources,
  queryKeys,
} from "@contraponha/client-core"

import { BodyEditor } from "@/components/composer/body-editor"
import { ImageStrip } from "@/components/composer/image-strip"
import { PublishChecklist } from "@/components/composer/publish-checklist"
import { SourcesField } from "@/components/composer/sources-field"
import { toolButtonClasses } from "@/components/composer/tool-button"
import { TopicsField } from "@/components/composer/topics-field"
import {
  Avatar,
  Banner,
  Button,
  Chip,
  ConfirmDialog,
  Field,
  Input,
  useApi,
  useI18n,
  useViewer,
} from "@contraponha/web-ui"
import { useImageUploads } from "@/hooks/use-image-upload"
import { readDraft, useLocalDraft } from "@/hooks/use-local-draft"
import { paths } from "@/lib/paths"

const DRAFT_KEY = "contraponha:composer-draft"

function valuesFrom(post: PostView): ComposerValues {
  return {
    title: post.title ?? "",
    body: post.body ?? "",
    sources: post.sources.map(({ url, title }) => ({ url, title: title ?? "" })),
    topics: post.topics.map(({ name }) => name),
    replyPolicy: post.replyPolicy,
    reason: "",
  }
}

export interface ComposerProps {
  post?: PostView
}

export function Composer({ post }: ComposerProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const router = useRouter()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const isEditing = post !== undefined
  const images = useImageUploads()

  const form = useForm<ComposerValues, unknown, ComposerOutput>({
    resolver: zodResolver(composerSchema),
    defaultValues: post ? valuesFrom(post) : EMPTY_COMPOSER,
  })

  const { control, register, handleSubmit, formState, reset } = form

  // Drafts live in this browser only, so they are restored after hydration.
  useEffect(() => {
    if (isEditing) return

    const saved = readDraft({ key: DRAFT_KEY, schema: composerDraftSchema })

    if (saved) reset(saved, { keepDefaultValues: true })
  }, [isEditing, reset])

  const [title, body, sources] = useWatch({ control, name: ["title", "body", "sources"] })
  const values = useWatch({ control })

  const draft = useLocalDraft({
    key: DRAFT_KEY,
    value: values,
    isEnabled: !isEditing && formState.isDirty,
  })

  const publish = useMutation({
    mutationFn: async (parsed: ComposerOutput): Promise<PostView> => {
      const sources = filledSources(parsed.sources)

      if (post) {
        return api.posts.update({
          postId: post.id,
          input: {
            title: parsed.title,
            body: parsed.body,
            sources,
            replyPolicy: parsed.replyPolicy,
            reason: parsed.reason,
          },
        })
      }

      return api.posts.create({
        title: parsed.title,
        body: parsed.body,
        sources,
        topics: parsed.topics,
        replyPolicy: parsed.replyPolicy,
        mediaIds: images.images.map(({ mediaId }) => mediaId),
      })
    },
    onSuccess: async (saved) => {
      draft.clear()

      toast.success(t("web.post.published"))

      await queryClient.invalidateQueries({ queryKey: queryKeys.feed.all })

      queryClient.setQueryData(queryKeys.post(saved.id), saved)

      router.push(paths.post(saved.id))
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const leave = (): void => {
    if (formState.isDirty && !isEditing) {
      setIsLeaving(true)

      return
    }

    router.back()
  }

  const sourceCount = filledSources(sources).length

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit((input) => publish.mutate(input))(event)}
    >
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 sm:px-8">
        <Button variant="ghost" className="-ml-2.5 px-2.5" onClick={leave}>
          <ArrowLeft aria-hidden className="size-5" />
          <span className="hidden sm:inline">{t("web.composer.exit")}</span>
        </Button>
        <span className="flex-1" />
        {draft.savedAt ? (
          <Chip className="hidden sm:inline-flex">{t("web.post.saved")}</Chip>
        ) : null}
        <Button variant="secondary" onClick={() => setIsPreviewing((value) => !value)}>
          {isPreviewing ? t("web.composer.write") : t("web.composer.preview")}
        </Button>
        <Button type="submit" isLoading={publish.isPending} disabled={images.isUploading}>
          {isEditing ? t("web.composer.saveChanges") : t("web.composer.publish")}
        </Button>
      </header>

      <div className="mx-auto flex max-w-290 flex-wrap gap-12 px-4 pt-12 pb-20 sm:px-8">
        <main id="content" className="flex max-w-180 min-w-0 flex-[999_1_560px] flex-col gap-5">
          <h1 className="sr-only">
            {isEditing ? t("web.composer.editTitle") : t("web.composer.newPost")}
          </h1>
          {viewer ? (
            <p className="flex items-center gap-3 text-sm text-muted">
              <Avatar id={viewer.id} name={viewer.displayName} src={viewer.avatarUrl} size="sm" />
              {t("web.composer.publishingAs", { name: viewer.displayName })}
            </p>
          ) : null}
          <label>
            <span className="sr-only">{t("web.composer.titlePlaceholder")}</span>
            <input
              {...register("title")}
              placeholder={t("web.composer.titlePlaceholder")}
              className="w-full bg-transparent font-serif text-3xl/tight font-semibold placeholder:text-subtle focus-visible:outline-none md:text-[38px]"
            />
          </label>
          <Controller
            control={control}
            name="body"
            render={({ field, fieldState }) => (
              <BodyEditor
                value={field.value}
                onChange={field.onChange}
                isPreviewing={isPreviewing}
                isInvalid={Boolean(fieldState.error)}
                extraTools={
                  isEditing ? null : (
                    <button
                      type="button"
                      aria-label={t("web.composer.image")}
                      title={t("web.composer.image")}
                      onClick={() => fileInputRef.current?.click()}
                      className={toolButtonClasses}
                    >
                      <ImagePlus aria-hidden className="size-4.5" />
                    </button>
                  )
                }
              />
            )}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(event) => {
              images.add(event.target.files)

              event.target.value = ""
            }}
          />
          <ImageStrip
            images={images.images}
            onRemove={images.remove}
            isUploading={images.isUploading}
          />
          <SourcesField control={control} register={register} errors={formState.errors} />
          {isEditing ? (
            <Field label={t("web.composer.editReason", { optional: t("web.common.optional") })}>
              {({ id }) => (
                <Input
                  id={id}
                  placeholder={t("web.composer.editReasonPlaceholder")}
                  {...register("reason")}
                />
              )}
            </Field>
          ) : (
            <Controller
              control={control}
              name="topics"
              render={({ field }) => <TopicsField value={field.value} onChange={field.onChange} />}
            />
          )}
          {formState.errors.body ? (
            <Banner tone="danger">{t("web.validation.required")}</Banner>
          ) : null}
        </main>
        <div className="w-full min-w-0 flex-[1_1_280px] lg:max-w-[320px]">
          <PublishChecklist control={control} title={title} body={body} sourceCount={sourceCount} />
        </div>
      </div>

      <ConfirmDialog
        cancelLabel={t("web.common.cancel")}

        closeLabel={t("web.common.close")}
        open={isLeaving}
        onOpenChange={setIsLeaving}
        title={t("web.composer.discardTitle")}
        description={t("web.composer.discardBody")}
        confirmLabel={t("web.composer.discard")}
        onConfirm={() => {
          draft.clear()

          router.back()
        }}
      />
    </form>
  )
}
