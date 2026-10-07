import {
  composerDraftSchema,
  composerSchema,
  EMPTY_COMPOSER,
  errorMessage,
  filledSources,
  queryKeys,
  type ComposerOutput,
  type ComposerValues,
} from "@contraponha/client-core"
import type { PostView } from "@contraponha/types"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import { ImagePlus, X } from "lucide-react-native"
import { useEffect, useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native"

import { BodyField } from "@/components/composer/body-field"
import { ImageStrip } from "@/components/composer/image-strip"
import { PublishChecklist } from "@/components/composer/publish-checklist"
import { SourcesField } from "@/components/composer/sources-field"
import { TopicsField } from "@/components/composer/topics-field"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { Screen } from "@/components/ui/screen"
import { Banner } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { useDeviceDraft } from "@/hooks/use-device-draft"
import { useImageUploads } from "@/hooks/use-image-uploads"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useRequiredViewer } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"
import { paths } from "@/lib/paths"
import { fonts, space } from "@/lib/theme"

const DRAFT_KEY = "contraponha.composer-draft"

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
  const viewer = useRequiredViewer()
  const toast = useToast()
  const palette = usePalette()
  const queryClient = useQueryClient()
  const [isPreviewing, setIsPreviewing] = useState(false)
  const isEditing = post !== undefined
  const images = useImageUploads()

  const form = useForm<ComposerValues, unknown, ComposerOutput>({
    resolver: zodResolver(composerSchema),
    defaultValues: post ? valuesFrom(post) : EMPTY_COMPOSER,
  })

  const { control, handleSubmit, formState, reset } = form
  const [title, body, sources] = useWatch({ control, name: ["title", "body", "sources"] })
  const values = useWatch({ control })

  const draft = useDeviceDraft({
    key: DRAFT_KEY,
    schema: composerDraftSchema,
    value: values,
    isEnabled: !isEditing && formState.isDirty,
  })

  useEffect(() => {
    if (!isEditing && draft.restored) reset(draft.restored, { keepDefaultValues: true })
  }, [isEditing, draft.restored, reset])

  const publish = useMutation({
    mutationFn: async (parsed: ComposerOutput): Promise<PostView> => {
      const filled = filledSources(parsed.sources)

      if (post) {
        return api.posts.update({
          postId: post.id,
          input: {
            title: parsed.title,
            body: parsed.body,
            sources: filled,
            replyPolicy: parsed.replyPolicy,
            reason: parsed.reason,
          },
        })
      }

      return api.posts.create({
        title: parsed.title,
        body: parsed.body,
        sources: filled,
        topics: parsed.topics,
        replyPolicy: parsed.replyPolicy,
        mediaIds: images.images.map(({ mediaId }) => mediaId),
      })
    },
    onSuccess: async (saved) => {
      draft.clear()

      toast.success(t("web.post.published"))

      queryClient.setQueryData(queryKeys.post(saved.id), saved)

      await queryClient.invalidateQueries({ queryKey: queryKeys.feed.all })

      router.dismissTo(paths.post(saved.id))
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const leave = (): void => {
    if (!formState.isDirty || isEditing) {
      router.back()

      return
    }

    Alert.alert(t("web.composer.discardTitle"), t("web.composer.discardBody"), [
      { text: t("web.composer.keepWriting"), style: "cancel" },
      {
        text: t("web.composer.discard"),
        style: "destructive",
        onPress: () => {
          draft.clear()

          router.back()
        },
      },
    ])
  }

  const submit = (): void => void handleSubmit((input) => publish.mutate(input))()
  const sourceCount = filledSources(sources).length

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={[styles.header, { borderBottomColor: palette.line }]}>
        <IconButton icon={X} label={t("web.composer.exit")} color={palette.ink} onPress={leave} />
        <View style={styles.flex} />
        <Button
          variant="secondary"
          size="sm"
          label={isPreviewing ? t("web.composer.write") : t("web.composer.preview")}
          onPress={() => setIsPreviewing((value) => !value)}
        />
        <Button
          size="sm"
          label={isEditing ? t("web.composer.saveChanges") : t("web.composer.publish")}
          isLoading={publish.isPending}
          disabled={images.isUploading}
          onPress={submit}
        />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.byline}>
            <Avatar id={viewer.id} name={viewer.displayName} size="sm" />
            <AppText variant="small" tone="muted">
              {t("web.composer.publishingAs", { name: viewer.displayName })}
            </AppText>
          </View>
          <Controller
            control={control}
            name="title"
            render={({ field }) =>
              isPreviewing ? (
                field.value ? (
                  <AppText variant="heading1">{field.value}</AppText>
                ) : (
                  <View />
                )
              ) : (
                <TextInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t("web.composer.titlePlaceholder")}
                  aria-label={t("web.composer.titlePlaceholder")}
                  placeholderTextColor={palette.subtle}
                  selectionColor={palette.brand}
                  multiline
                  style={[styles.title, { color: palette.ink }]}
                />
              )
            }
          />
          <Controller
            control={control}
            name="body"
            render={({ field, fieldState }) => (
              <BodyField
                value={field.value}
                onChange={field.onChange}
                isPreviewing={isPreviewing}
                isInvalid={Boolean(fieldState.error)}
                extraTools={
                  isEditing ? null : (
                    <IconButton
                      icon={ImagePlus}
                      size={19}
                      label={t("web.composer.image")}
                      onPress={images.pick}
                    />
                  )
                }
              />
            )}
          />
          {formState.errors.body ? (
            <Banner tone="danger">{t("web.validation.required")}</Banner>
          ) : null}
          <ImageStrip
            images={images.images}
            isUploading={images.isUploading}
            onRemove={images.remove}
          />
          <SourcesField control={control} errors={formState.errors} />
          {isEditing ? (
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <TextField
                  label={t("web.composer.editReason", { optional: t("web.common.optional") })}
                  placeholder={t("web.composer.editReasonPlaceholder")}
                  value={field.value}
                  onChangeText={field.onChange}
                />
              )}
            />
          ) : (
            <Controller
              control={control}
              name="topics"
              render={({ field }) => <TopicsField value={field.value} onChange={field.onChange} />}
            />
          )}
          <PublishChecklist control={control} title={title} body={body} sourceCount={sourceCount} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: 56,
    paddingLeft: space.sm,
    paddingRight: space.gutter,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: { padding: space.gutter, gap: space.xl, paddingBottom: 64 },
  byline: { flexDirection: "row", alignItems: "center", gap: space.md },
  title: { fontFamily: fonts.serifSemibold, fontSize: 28, lineHeight: 34, padding: 0 },
})
