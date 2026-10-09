"use client"

import { Button } from "./button.js"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "./overlays.js"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  closeLabel: string
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
  cancelLabel,
  closeLabel,
  onConfirm,
  isPending = false,
  tone = "danger",
  children,
}: ConfirmDialogProps): React.JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={closeLabel}>
        <DialogTitle className="pr-8 font-serif text-[25px] leading-tight font-semibold">
          {title}
        </DialogTitle>
        <DialogDescription className="text-muted">{description}</DialogDescription>
        {children}
        <div className="flex flex-wrap justify-end gap-3">
          <DialogClose asChild>
            <Button variant="ghost">{cancelLabel}</Button>
          </DialogClose>
          <Button variant={tone} onClick={onConfirm} isLoading={isPending}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
