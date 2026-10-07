"use client"

import { HIGHLIGHT_NOTE_MAX_LENGTH } from "@ponto/config"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import { Field, Input } from "@/components/ui/field"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/overlays"
import { errorMessage } from "@/lib/api-errors"
import { queryKeys } from "@/lib/query-keys"

export interface HighlightDialogProps {
  commentId: string
  postId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HighlightDialog({
  commentId,
  postId,
  open,
  onOpenChange,
}: HighlightDialogProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const queryClient = useQueryClient()
  const [note, setNote] = useState("")

  const mutation = useMutation({
    mutationFn: () => api.comments.highlight({ commentId, input: { note } }),
    onSuccess: async () => {
      onOpenChange(false)

      setNote("")

      await queryClient.invalidateQueries({ queryKey: queryKeys.commentsOfPost(postId) })
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("web.common.close")}>
        <DialogTitle className="font-serif text-[25px] font-semibold">
          {t("web.comment.highlightTitle")}
        </DialogTitle>
        <DialogDescription className="text-muted">
          {t("web.comment.highlightLead")}
        </DialogDescription>
        <Field label={t("web.comment.highlightNoteLabel", { optional: t("web.common.optional") })}>
          {({ id }) => (
            <Input
              id={id}
              value={note}
              maxLength={HIGHLIGHT_NOTE_MAX_LENGTH}
              placeholder={t("web.comment.highlightNotePlaceholder")}
              onChange={(event) => setNote(event.target.value)}
            />
          )}
        </Field>
        <div className="flex justify-end">
          <Button onClick={() => mutation.mutate()} isLoading={mutation.isPending}>
            {t("web.comment.highlight")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
