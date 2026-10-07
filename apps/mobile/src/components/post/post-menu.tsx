import { canModerate, isWithinEditWindow } from "@contraponha/client-core"
import {
  useDeletePostMutation,
  usePinMutation,
  useRemoveContentMutation,
} from "@contraponha/client-core/react"
import type { CommunityRule, PostView } from "@contraponha/types"
import * as Clipboard from "expo-clipboard"
import { router } from "expo-router"
import {
  Flag,
  History,
  Link2,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  ScrollText,
  ShieldX,
  Trash2,
} from "lucide-react-native"
import { useState } from "react"
import { Alert } from "react-native"

import { ContextNoteSheet } from "@/components/post/context-note-sheet"
import { ReportSheet } from "@/components/post/report-sheet"
import { RuleSelect } from "@/components/post/rule-select"
import { ActionSheet, type ActionSheetItem } from "@/components/ui/action-sheet"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { Sheet } from "@/components/ui/sheet"
import { AppText } from "@/components/ui/text"
import { useI18n } from "@/providers/i18n-provider"
import { useViewer } from "@/providers/session-provider"
import { useToast } from "@/providers/toast-provider"
import { paths, shareUrls } from "@/lib/paths"

type OpenPanel = "menu" | "report" | "remove" | "context" | null

export interface PostMenuProps {
  post: PostView
  afterDelete?: () => void
}

export function PostMenu({ post, afterDelete }: PostMenuProps): React.JSX.Element {
  const { t } = useI18n()
  const viewer = useViewer()
  const toast = useToast()
  const [panel, setPanel] = useState<OpenPanel>(null)
  const [rule, setRule] = useState<CommunityRule>()
  const pin = usePinMutation()
  const remove = useDeletePostMutation()
  const moderate = useRemoveContentMutation()
  const isOwner = viewer?.id === post.author?.id
  const isModerator = canModerate(viewer)
  const canEdit = isOwner && isWithinEditWindow({ createdAt: post.createdAt })

  const confirmDelete = (): void => {
    Alert.alert(t("web.post.deleteTitle"), t("web.post.deleteBody"), [
      { text: t("web.common.cancel"), style: "cancel" },
      {
        text: t("web.common.delete"),
        style: "destructive",
        onPress: () => remove.mutate(post.id, { onSuccess: () => afterDelete?.() }),
      },
    ])
  }

  const items: ActionSheetItem[] = [
    {
      key: "copy",
      label: t("web.post.copyLink"),
      icon: Link2,
      onPress: () => {
        void Clipboard.setStringAsync(shareUrls.post(post.id)).then(() =>
          toast.show(t("web.common.copied")),
        )
      },
    },
    ...(post.editedAt
      ? [
          {
            key: "history",
            label: t("web.post.edited"),
            icon: History,
            onPress: () => router.push(paths.history(post.id)),
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            key: "edit",
            label: t("web.post.editPost"),
            icon: Pencil,
            onPress: () => router.push(paths.editPost(post.id)),
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            key: "pin",
            label: post.isPinned ? t("web.post.unpin") : t("web.post.pin"),
            icon: post.isPinned ? PinOff : Pin,
            onPress: () => pin.mutate({ postId: post.id, isPinning: !post.isPinned }),
          },
          {
            key: "delete",
            label: t("web.post.deletePost"),
            icon: Trash2,
            tone: "danger" as const,
            onPress: confirmDelete,
          },
        ]
      : []),
    ...(viewer && !isOwner
      ? [
          {
            key: "report",
            label: t("web.post.report"),
            icon: Flag,
            tone: "danger" as const,
            onPress: () => setPanel("report"),
          },
        ]
      : []),
    ...(isModerator
      ? [
          {
            key: "context",
            label: t("web.moderation.addContext"),
            icon: ScrollText,
            onPress: () => setPanel("context"),
          },
          {
            key: "remove",
            label: t("web.moderation.removePost"),
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
        label={t("web.post.options")}
        onPress={() => setPanel("menu")}
      />
      <ActionSheet isOpen={panel === "menu"} items={items} onClose={() => setPanel(null)} />
      <ReportSheet
        targetType="post"
        targetId={post.id}
        excerpt={post.title ?? post.body?.slice(0, 200)}
        isOpen={panel === "report"}
        onClose={() => setPanel(null)}
      />
      <ContextNoteSheet post={post} isOpen={panel === "context"} onClose={() => setPanel(null)} />
      <Sheet
        isOpen={panel === "remove"}
        title={t("web.moderation.removeTitle")}
        onClose={() => setPanel(null)}
        footer={
          <Button
            variant="danger"
            label={t("web.moderation.removePost")}
            isLoading={moderate.isPending}
            disabled={!rule}
            onPress={() => {
              if (!rule) return

              moderate.mutate(
                { targetType: "post", targetId: post.id, rule },
                { onSuccess: () => setPanel(null) },
              )
            }}
          />
        }
      >
        <AppText tone="muted">{post.title ?? post.body?.slice(0, 160) ?? ""}</AppText>
        <AppText variant="smallStrong">{t("web.moderation.rule")}</AppText>
        <RuleSelect value={rule} onChange={setRule} />
      </Sheet>
    </>
  )
}
