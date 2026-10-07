"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import * as DropdownPrimitive from "@radix-ui/react-dropdown-menu"
import { X } from "lucide-react"

import { cn } from "@/lib/cn"

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  closeLabel: string
  side?: "center" | "right"
}

export function DialogContent({
  className,
  children,
  closeLabel,
  side = "center",
  ...props
}: DialogContentProps): React.JSX.Element {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-scrim data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col gap-5 bg-surface-raised p-7 shadow-e3 focus:outline-none data-[state=closed]:animate-fade-out",
          side === "center"
            ? "data-[state=open]:animate-pop-in left-1/2 top-[8vh] max-h-[84vh] w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 overflow-y-auto rounded-xl"
            : "data-[state=open]:animate-slide-in-right inset-y-0 right-0 w-full max-w-[420px] overflow-y-auto",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="absolute right-4 top-4 grid size-9 place-items-center rounded-md text-muted hover:bg-surface-sunken"
        >
          <X aria-hidden className="size-5" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export const Menu = DropdownPrimitive.Root
export const MenuTrigger = DropdownPrimitive.Trigger

export function MenuContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownPrimitive.Content>): React.JSX.Element {
  return (
    <DropdownPrimitive.Portal>
      <DropdownPrimitive.Content
        sideOffset={6}
        align="end"
        className={cn(
          "z-50 min-w-56 origin-(--radix-dropdown-menu-content-transform-origin) rounded-[12px] border border-line bg-surface-raised p-1.5 shadow-e2 data-[state=closed]:animate-fade-out data-[state=open]:animate-pop-in",
          className,
        )}
        {...props}
      />
    </DropdownPrimitive.Portal>
  )
}

export interface MenuItemProps extends React.ComponentProps<typeof DropdownPrimitive.Item> {
  tone?: "default" | "danger"
}

export function MenuItem({
  className,
  tone = "default",
  ...props
}: MenuItemProps): React.JSX.Element {
  return (
    <DropdownPrimitive.Item
      className={cn(
        "flex h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-[15px] outline-none transition-colors data-[highlighted]:bg-surface-sunken",
        tone === "danger" ? "text-danger" : "text-ink",
        className,
      )}
      {...props}
    />
  )
}
