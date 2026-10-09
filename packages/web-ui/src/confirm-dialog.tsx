"use client"

import { useI18n } from "@/components/providers/i18n-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/overlays"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  isPending?: boolean
  tone?: "danger" | "primary"
  children?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending = false,
  tone = "danger",
  children,
}: ConfirmDialogProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("web.common.close")}>
        <DialogTitle className="pr-8 font-serif text-[25px] leading-tight font-semibold">
          {title}
        </DialogTitle>
        <DialogDescription className="text-muted">{description}</DialogDescription>
        {children}
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">{t("web.common.cancel")}</Button>
          </DialogClose>
          <Button variant={tone} onClick={onConfirm} isLoading={isPending}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
