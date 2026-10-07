"use client"

import type { CommunityRule } from "@contraponha/types"
import { type PostView } from "@contraponha/types"
import {
  Flag,
  Link2,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  ScrollText,
  ShieldX,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { canModerate, isWithinEditWindow } from "@contraponha/client-core"

import { ContextNoteDialog } from "@/components/post/context-note-dialog"
import { ReportDialog } from "@/components/post/report-dialog"
import { RuleSelect } from "@/components/post/rule-select"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlays"
import { useRemoveContentMutation } from "@/hooks/use-moderation"
import { useDeletePostMutation, usePinMutation } from "@/hooks/use-post-mutations"
import { paths } from "@/lib/paths"

type OpenDialog = "delete" | "report" | "remove" | "context" | null

export interface PostMenuProps {
  post: PostView
  afterDelete?: () => void
}

export function PostMenu({ post, afterDelete }: PostMenuProps): React.JSX.Element {
  const { t } = useI18n()
  const viewer = useViewer()
  const router = useRouter()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [rule, setRule] = useState<CommunityRule>()
  const pin = usePinMutation()
  const remove = useDeletePostMutation()
  const moderate = useRemoveContentMutation()
  const isOwner = viewer?.id === post.author?.id
  const isModerator = canModerate(viewer)
  const canEdit = isOwner && isWithinEditWindow({ createdAt: post.createdAt })

  const copyLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(
      new URL(paths.post(post.id), window.location.origin).toString(),
    )

    toast(t("web.common.copied"))
  }

  const closeDialog = (open: boolean): void => {
    if (!open) setDialog(null)
  }

  return (
    <>
      <Menu>
        <MenuTrigger
          aria-label={t("web.post.options")}
          className="grid size-11 flex-none place-items-center rounded-md text-muted hover:bg-surface-sunken"
        >
          <MoreHorizontal aria-hidden className="size-5" />
        </MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => void copyLink()}>
            <Link2 aria-hidden className="size-4" />
            {t("web.post.copyLink")}
          </MenuItem>
          {canEdit ? (
            <MenuItem onSelect={() => router.push(paths.editPost(post.id))}>
              <Pencil aria-hidden className="size-4" />
              {t("web.post.editPost")}
            </MenuItem>
          ) : null}
          {isOwner ? (
            <MenuItem onSelect={() => pin.mutate({ postId: post.id, isPinning: !post.isPinned })}>
              {post.isPinned ? (
                <PinOff aria-hidden className="size-4" />
              ) : (
                <Pin aria-hidden className="size-4" />
              )}
              {post.isPinned ? t("web.post.unpin") : t("web.post.pin")}
            </MenuItem>
          ) : null}
          {isOwner ? (
            <MenuItem tone="danger" onSelect={() => setDialog("delete")}>
              <Trash2 aria-hidden className="size-4" />
              {t("web.post.deletePost")}
            </MenuItem>
          ) : null}
          {viewer && !isOwner ? (
            <MenuItem tone="danger" onSelect={() => setDialog("report")}>
              <Flag aria-hidden className="size-4" />
              {t("web.post.report")}
            </MenuItem>
          ) : null}
          {isModerator ? (
            <>
              <MenuItem onSelect={() => setDialog("context")}>
                <ScrollText aria-hidden className="size-4" />
                {t("web.moderation.addContext")}
              </MenuItem>
              <MenuItem tone="danger" onSelect={() => setDialog("remove")}>
                <ShieldX aria-hidden className="size-4" />
                {t("web.moderation.removePost")}
              </MenuItem>
            </>
          ) : null}
        </MenuContent>
      </Menu>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={closeDialog}
        title={t("web.post.deleteTitle")}
        description={t("web.post.deleteBody")}
        confirmLabel={t("web.common.delete")}
        isPending={remove.isPending}
        onConfirm={() =>
          remove.mutate(post.id, {
            onSuccess: () => {
              setDialog(null)

              afterDelete?.()
            },
          })
        }
      />

      <ConfirmDialog
        open={dialog === "remove"}
        onOpenChange={closeDialog}
        title={t("web.moderation.removeTitle")}
        description={post.title ?? post.body?.slice(0, 160) ?? ""}
        confirmLabel={t("web.moderation.removePost")}
        isPending={moderate.isPending}
        onConfirm={() => {
          if (!rule) return

          moderate.mutate(
            { targetType: "post", targetId: post.id, rule },
            { onSuccess: () => setDialog(null) },
          )
        }}
      >
        <RuleSelect value={rule} onChange={setRule} />
      </ConfirmDialog>

      <ReportDialog
        targetType="post"
        targetId={post.id}
        excerpt={post.title ?? post.body?.slice(0, 200)}
        open={dialog === "report"}
        onOpenChange={closeDialog}
      />

      <ContextNoteDialog post={post} open={dialog === "context"} onOpenChange={closeDialog} />
    </>
  )
}
