"use client"

import type { CommentView, CommunityRule } from "@ponto/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Flag, MoreHorizontal, ShieldX, Star, StarOff, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { commentActionClasses } from "@/components/discussion/comment-actions"
import { HighlightDialog } from "@/components/discussion/highlight-dialog"
import { ReportDialog } from "@/components/post/report-dialog"
import { RuleSelect } from "@/components/post/rule-select"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlays"
import { useRemoveContentMutation } from "@/hooks/use-moderation"
import { errorMessage } from "@/lib/api-errors"
import { cn } from "@/lib/cn"
import { queryKeys } from "@/lib/query-keys"
import { canModerate } from "@/lib/roles"

const EXCERPT_LENGTH = 200

type OpenDialog = "delete" | "report" | "highlight" | "remove" | null

export interface CommentMenuProps {
  comment: CommentView
  postAuthorId: string | undefined
}

export function CommentMenu({ comment, postAuthorId }: CommentMenuProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [rule, setRule] = useState<CommunityRule>()
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

      setDialog(null)

      await refresh()
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const unhighlight = useMutation({
    mutationFn: () => api.comments.unhighlight(comment.id),
    onSuccess: refresh,
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const closeOnDismiss = (open: boolean): void => {
    if (!open) setDialog(null)
  }

  const handleModerate = (): void => {
    if (!rule) return

    moderate.mutate(
      { targetType: "comment", targetId: comment.id, rule },
      { onSuccess: () => setDialog(null) },
    )
  }

  return (
    <>
      <Menu>
        <MenuTrigger
          aria-label={t("web.comment.options")}
          className={cn(commentActionClasses, "px-2")}
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </MenuTrigger>
        <MenuContent>
          {isPostAuthor && !isOwner && comment.highlight ? (
            <MenuItem onSelect={() => unhighlight.mutate()}>
              <StarOff aria-hidden className="size-4" />
              {t("web.comment.unhighlight")}
            </MenuItem>
          ) : null}
          {isPostAuthor && !isOwner && !comment.highlight ? (
            <MenuItem onSelect={() => setDialog("highlight")}>
              <Star aria-hidden className="size-4" />
              {t("web.comment.highlight")}
            </MenuItem>
          ) : null}
          {isOwner ? (
            <MenuItem tone="danger" onSelect={() => setDialog("delete")}>
              <Trash2 aria-hidden className="size-4" />
              {t("web.common.delete")}
            </MenuItem>
          ) : (
            <MenuItem tone="danger" onSelect={() => setDialog("report")}>
              <Flag aria-hidden className="size-4" />
              {t("web.post.report")}
            </MenuItem>
          )}
          {canModerate(viewer) ? (
            <MenuItem tone="danger" onSelect={() => setDialog("remove")}>
              <ShieldX aria-hidden className="size-4" />
              {t("web.moderation.removeComment")}
            </MenuItem>
          ) : null}
        </MenuContent>
      </Menu>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={closeOnDismiss}
        title={t("web.comment.deleteTitle")}
        description={excerpt}
        confirmLabel={t("web.common.delete")}
        isPending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
      <ConfirmDialog
        open={dialog === "remove"}
        onOpenChange={closeOnDismiss}
        title={t("web.moderation.removeTitle")}
        description={excerpt}
        confirmLabel={t("web.moderation.removeComment")}
        isPending={moderate.isPending}
        onConfirm={handleModerate}
      >
        <RuleSelect value={rule} onChange={setRule} />
      </ConfirmDialog>
      <ReportDialog
        targetType="comment"
        targetId={comment.id}
        excerpt={excerpt}
        open={dialog === "report"}
        onOpenChange={closeOnDismiss}
      />
      <HighlightDialog
        commentId={comment.id}
        postId={comment.postId}
        open={dialog === "highlight"}
        onOpenChange={closeOnDismiss}
      />
    </>
  )
}
