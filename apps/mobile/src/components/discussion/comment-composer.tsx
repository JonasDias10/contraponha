import { errorMessage, queryKeys } from "@contraponha/client-core"
import { commentBodySchema, httpUrlSchema } from "@contraponha/validation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { BookText } from "lucide-react-native"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { StyleSheet, TextInput, View } from "react-native"
import { z } from "zod"

import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/surfaces"
import { TextField } from "@/components/ui/text-field"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useRequiredViewer } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"
import { fonts, space } from "@/lib/theme"

const commentFormSchema = z.object({
  body: commentBodySchema,
  sourceUrl: z.union([httpUrlSchema, z.literal("")]),
})

type CommentValues = z.input<typeof commentFormSchema>

export interface CommentComposerProps {
  postId: string
  parentId?: string
  isAutoFocused?: boolean
  onDone?: () => void
}

export function CommentComposer({
  postId,
  parentId,
  isAutoFocused = false,
  onDone,
}: CommentComposerProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useRequiredViewer()
  const toast = useToast()
  const palette = usePalette()
  const queryClient = useQueryClient()
  const [isSourceOpen, setIsSourceOpen] = useState(false)

  const { control, handleSubmit, reset, formState } = useForm<CommentValues>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { body: "", sourceUrl: "" },
  })

  const body = useWatch({ control, name: "body" })

  const mutation = useMutation({
    mutationFn: ({ body: text, sourceUrl }: CommentValues) =>
      api.comments.create({
        postId,
        input: { body: text, parentId, sources: sourceUrl ? [{ url: sourceUrl }] : [] },
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

  const placeholder = parentId
    ? t("web.comment.replyPlaceholder")
    : t("web.post.composerPlaceholder")

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Avatar id={viewer.id} name={viewer.displayName} size="sm" />
        <Controller
          control={control}
          name="body"
          render={({ field }) => (
            <TextInput
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              placeholder={placeholder}
              aria-label={placeholder}
              placeholderTextColor={palette.subtle}
              selectionColor={palette.brand}
              autoFocus={isAutoFocused}
              multiline
              style={[styles.input, { color: palette.ink }]}
            />
          )}
        />
      </View>
      {isSourceOpen ? (
        <Controller
          control={control}
          name="sourceUrl"
          render={({ field }) => (
            <TextField
              label={t("web.composer.sourceUrl")}
              placeholder="https://"
              value={field.value}
              onChangeText={field.onChange}
              autoCapitalize="none"
              keyboardType="url"
              error={formState.errors.sourceUrl ? t("web.validation.url") : undefined}
            />
          )}
        />
      ) : null}
      <View style={styles.actions}>
        {isSourceOpen ? null : (
          <Button
            variant="ghost"
            size="sm"
            icon={BookText}
            label={t("web.post.composerSource")}
            onPress={() => setIsSourceOpen(true)}
          />
        )}
        <Button
          size="sm"
          label={parentId ? t("web.comment.reply") : t("web.post.composerSubmit")}
          disabled={!body.trim()}
          isLoading={mutation.isPending}
          onPress={() => void handleSubmit((values) => mutation.mutate(values))()}
        />
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.lg },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  input: {
    flex: 1,
    minHeight: 56,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 24,
    paddingTop: 4,
  },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: space.sm },
})
