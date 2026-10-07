"use client"

import * as PopoverPrimitive from "@radix-ui/react-popover"
import { httpUrlSchema } from "@ponto/validation"
import type { Editor } from "@tiptap/react"
import { Link2 } from "lucide-react"
import { useState } from "react"

import { useI18n } from "@/components/providers/i18n-provider"
import { toolButtonClasses } from "@/components/composer/tool-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/field"

export interface LinkPopoverProps {
  editor: Editor
  isActive: boolean
}

interface ApplyLinkParams {
  editor: Editor
  href: string
}

function withProtocol(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function applyLink({ editor, href }: ApplyLinkParams): void {
  if (editor.state.selection.empty && !editor.isActive("link")) {
    editor
      .chain()
      .focus()
      .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
      .run()

    return
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
}

export function LinkPopover({ editor, isActive }: LinkPopoverProps): React.JSX.Element {
  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState("")
  const [isInvalid, setIsInvalid] = useState(false)

  const handleOpenChange = (open: boolean): void => {
    if (open) {
      const current: unknown = editor.getAttributes("link").href

      setUrl(typeof current === "string" ? current : "")

      setIsInvalid(false)
    }

    setIsOpen(open)
  }

  // The popover renders in a portal but React still bubbles submit to the composer form.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault()

    event.stopPropagation()

    const href = withProtocol(url.trim())

    if (!httpUrlSchema.safeParse(href).success) {
      setIsInvalid(true)

      return
    }

    applyLink({ editor, href })

    setIsOpen(false)
  }

  const handleRemove = (): void => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run()

    setIsOpen(false)
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger
        type="button"
        aria-label={t("web.composer.link")}
        title={t("web.composer.link")}
        aria-pressed={isActive}
        className={toolButtonClasses}
      >
        <Link2 aria-hidden className="size-[18px]" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={6}
          align="start"
          className="z-50 w-[min(360px,calc(100vw-32px))] origin-(--radix-popover-content-transform-origin) rounded-[12px] border border-line bg-surface-raised p-3 shadow-e2 data-[state=closed]:animate-fade-out data-[state=open]:animate-pop-in"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              {t("web.composer.linkUrl")}
              <Input
                type="text"
                inputMode="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                aria-invalid={isInvalid}
                placeholder="https://"
                autoFocus
              />
            </label>
            <div className="flex justify-end gap-2">
              {isActive ? (
                <Button type="button" variant="ghost" onClick={handleRemove}>
                  {t("web.composer.removeLink")}
                </Button>
              ) : null}
              <Button type="submit">{t("web.composer.applyLink")}</Button>
            </div>
          </form>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
