"use client"

import type { ProfileView } from "@contraponha/types"
import { useRelationMutation } from "@contraponha/client-core/react"
import {
  Button,
  ConfirmDialog,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  useI18n,
} from "@contraponha/web-ui"
import { Ban, Flag, MoreHorizontal, VolumeX } from "lucide-react"
import { useState } from "react"

import { ReportDialog } from "@/components/post/report-dialog"

export interface ProfileActionsMenuProps {
  profile: ProfileView
}

type OpenDialog = "report" | "block" | null

// Mute, block and report for someone else's profile.
export function ProfileActionsMenu({ profile }: ProfileActionsMenuProps): React.JSX.Element {
  const { t } = useI18n()
  const relation = useRelationMutation()
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const { handle } = profile
  const isBlocking = profile.viewer?.isBlocking ?? false
  const isMuting = profile.viewer?.isMuting ?? false

  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <Button variant="secondary" size="icon" aria-label={t("web.post.options")}>
            <MoreHorizontal aria-hidden className="size-5" />
          </Button>
        </MenuTrigger>
        <MenuContent>
          {isBlocking ? null : (
            <MenuItem onSelect={() => relation.mutate({ handle, kind: "mute", isOn: !isMuting })}>
              <VolumeX aria-hidden className="size-4" />
              {isMuting
                ? t("web.relations.unmute", { handle })
                : t("web.relations.mute", { handle })}
            </MenuItem>
          )}
          <MenuItem
            onSelect={() =>
              isBlocking
                ? relation.mutate({ handle, kind: "block", isOn: false })
                : setDialog("block")
            }
          >
            <Ban aria-hidden className="size-4" />
            {isBlocking
              ? t("web.relations.unblock", { handle })
              : t("web.relations.block", { handle })}
          </MenuItem>
          <MenuItem tone="danger" onSelect={() => setDialog("report")}>
            <Flag aria-hidden className="size-4" />
            {t("web.profile.report")}
          </MenuItem>
        </MenuContent>
      </Menu>
      <ConfirmDialog
        open={dialog === "block"}
        onOpenChange={(open) => setDialog(open ? "block" : null)}
        title={t("web.relations.blockTitle", { handle })}
        description={t("web.relations.blockBody")}
        confirmLabel={t("web.relations.blockConfirm")}
        cancelLabel={t("web.common.cancel")}
        closeLabel={t("web.common.close")}
        isPending={relation.isPending}
        onConfirm={() =>
          relation.mutate(
            { handle, kind: "block", isOn: true },
            { onSuccess: () => setDialog(null) },
          )
        }
      />
      <ReportDialog
        targetType="user"
        targetId={profile.id}
        open={dialog === "report"}
        onOpenChange={(open) => setDialog(open ? "report" : null)}
      />
    </>
  )
}
