import { HIGHLIGHT_NOTE_MAX_LENGTH } from "@contraponha/config"
import { canModerate, errorMessage, queryKeys } from "@contraponha/client-core"
import { useRemoveContentMutation } from "@contraponha/client-core/react"
import type { CommentView, CommunityRule } from "@contraponha/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Flag, MoreHorizontal, ShieldX, Star, StarOff, Trash2 } from "lucide-react-native"
import { useState } from "react"
import { Alert } from "react-native"

import { ReportSheet } from "@/components/post/report-sheet"
import { RuleSelect } from "@/components/post/rule-select"
import { ActionSheet, type ActionSheetItem } from "@/components/ui/action-sheet"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { Sheet } from "@/components/ui/sheet"
import { AppText } from "@/components/ui/text"
import { TextField } from "@/components/ui/text-field"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useViewer } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"

const EXCERPT_LENGTH = 200

type OpenPanel = "menu" | "report" | "highlight" | "remove" | null

export interface CommentMenuProps {
  comment: CommentView
  postAuthorId: string | undefined
}

export function CommentMenu({ comment, postAuthorId }: CommentMenuProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [panel, setPanel] = useState<OpenPanel>(null)
  const [rule, setRule] = useState<CommunityRule>()
  const [note, setNote] = useState("")
  const moderate = useRemoveContentMutation()
  const isOwner = viewer?.id === comment.author?.id
  const isPostAuthor = viewer !== null && viewer.id === postAuthorId
  const excerpt = comment.body?.slice(0, EXCERPT_LENGTH) ?? ""

  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.commentsOfPost(comment.postId) })

  const remove = useMutation({
    mutationFn: () => api.comments.delete(comment.id),
    onSuccess: async () => {
      toast.success(t("web.comment.deleted"))

      await refresh()
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const highlight = useMutation({
    mutationFn: () => api.comments.highlight({ commentId: comment.id, input: { note } }),
    onSuccess: async () => {
      setPanel(null)

      setNote("")

      await refresh()
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const unhighlight = useMutation({
    mutationFn: () => api.comments.unhighlight(comment.id),
    onSuccess: refresh,
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const confirmDelete = (): void => {
    Alert.alert(t("web.comment.deleteTitle"), excerpt, [
      { text: t("web.common.cancel"), style: "cancel" },
      { text: t("web.common.delete"), style: "destructive", onPress: () => remove.mutate() },
    ])
  }

  const items: ActionSheetItem[] = [
    ...(isPostAuthor && !isOwner && comment.highlight
      ? [
          {
            key: "unhighlight",
            label: t("web.comment.unhighlight"),
            icon: StarOff,
            onPress: () => unhighlight.mutate(),
          },
        ]
      : []),
    ...(isPostAuthor && !isOwner && !comment.highlight
      ? [
          {
            key: "highlight",
            label: t("web.comment.highlight"),
            icon: Star,
            onPress: () => setPanel("highlight"),
          },
        ]
      : []),
    isOwner
      ? {
          key: "delete",
          label: t("web.common.delete"),
          icon: Trash2,
          tone: "danger" as const,
          onPress: confirmDelete,
        }
      : {
          key: "report",
          label: t("web.post.report"),
          icon: Flag,
          tone: "danger" as const,
          onPress: () => setPanel("report"),
        },
    ...(canModerate(viewer)
      ? [
          {
            key: "remove",
            label: t("web.moderation.removeComment"),
            icon: ShieldX,
            tone: "danger" as const,
            onPress: () => setPanel("remove"),
          },
        ]
      : []),
  ]

  return (
    <>
      <IconButton
        icon={MoreHorizontal}
        size={18}
        label={t("web.comment.options")}
        onPress={() => setPanel("menu")}
      />
      <ActionSheet isOpen={panel === "menu"} items={items} onClose={() => setPanel(null)} />
      <ReportSheet
        targetType="comment"
        targetId={comment.id}
        excerpt={excerpt}
        isOpen={panel === "report"}
        onClose={() => setPanel(null)}
      />
      <Sheet
        isOpen={panel === "highlight"}
        title={t("web.comment.highlightTitle")}
        onClose={() => setPanel(null)}
        footer={
          <Button
            label={t("web.comment.highlight")}
            isLoading={highlight.isPending}
            onPress={() => highlight.mutate()}
          />
        }
      >
        <AppText tone="muted">{t("web.comment.highlightLead")}</AppText>
        <TextField
          label={t("web.comment.highlightNoteLabel", { optional: t("web.common.optional") })}
          placeholder={t("web.comment.highlightNotePlaceholder")}
          value={note}
          maxLength={HIGHLIGHT_NOTE_MAX_LENGTH}
          onChangeText={setNote}
        />
      </Sheet>
      <Sheet
        isOpen={panel === "remove"}
        title={t("web.moderation.removeTitle")}
        onClose={() => setPanel(null)}
        footer={
          <Button
            variant="danger"
            label={t("web.moderation.removeComment")}
            disabled={!rule}
            isLoading={moderate.isPending}
            onPress={() => {
              if (!rule) return

              moderate.mutate(
                { targetType: "comment", targetId: comment.id, rule },
                { onSuccess: () => setPanel(null) },
              )
            }}
          />
        }
      >
        <AppText tone="muted">{excerpt}</AppText>
        <AppText variant="smallStrong">{t("web.moderation.rule")}</AppText>
        <RuleSelect value={rule} onChange={setRule} />
      </Sheet>
    </>
  )
}
