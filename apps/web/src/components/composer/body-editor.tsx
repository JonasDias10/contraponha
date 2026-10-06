"use client"

import { Bold, Italic, Link2, List, Quote, type LucideIcon } from "lucide-react"
import { useRef } from "react"

import { Markdown } from "@/components/post/markdown"
import { useI18n } from "@/components/providers/i18n-provider"
import { applyMarkdown, type MarkdownAction } from "@/lib/markdown-edit"

interface Tool {
  action: MarkdownAction
  Icon: LucideIcon
}

const TOOLS: Tool[] = [
  { action: "bold", Icon: Bold },
  { action: "italic", Icon: Italic },
  { action: "list", Icon: List },
  { action: "quote", Icon: Quote },
  { action: "link", Icon: Link2 },
]

export interface BodyEditorProps {
  value: string
  onChange: (value: string) => void
  isPreviewing: boolean
  isInvalid: boolean
  extraTools?: React.ReactNode
}

export function BodyEditor({
  value,
  onChange,
  isPreviewing,
  isInvalid,
  extraTools,
}: BodyEditorProps): React.JSX.Element {
  const { t } = useI18n()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const apply = (action: MarkdownAction): void => {
    const textarea = textareaRef.current

    if (!textarea) return

    const result = applyMarkdown({
      selection: { value, start: textarea.selectionStart, end: textarea.selectionEnd },
      action,
      linkPlaceholder: t("web.composer.linkPlaceholder"),
    })

    onChange(result.value)

    requestAnimationFrame(() => {
      textarea.focus()

      textarea.setSelectionRange(result.selectionStart, result.selectionEnd)
    })
  }

  if (isPreviewing) return <Markdown text={value} className="min-h-60 text-[19px] leading-[1.65]" />

  return (
    <div className="flex flex-col gap-4">
      <div
        role="toolbar"
        aria-label={t("web.composer.toolbar")}
        className="flex items-center gap-0.5 self-start rounded-[12px] border border-line bg-surface-raised p-1"
      >
        {TOOLS.map(({ action, Icon }) => (
          <button
            key={action}
            type="button"
            aria-label={t(`web.composer.${action}`)}
            title={t(`web.composer.${action}`)}
            onClick={() => apply(action)}
            className="grid size-9 place-items-center rounded-[8px] text-muted hover:bg-surface-sunken hover:text-ink"
          >
            <Icon aria-hidden className="size-[18px]" />
          </button>
        ))}
        {extraTools}
      </div>
      <label>
        <span className="sr-only">{t("web.composer.bodyPlaceholder")}</span>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("web.composer.bodyPlaceholder")}
          aria-invalid={isInvalid}
          rows={12}
          className="field-sizing-content block min-h-60 w-full resize-none bg-transparent font-serif text-[19px] leading-[1.65] placeholder:text-subtle focus-visible:outline-none aria-invalid:rounded-md aria-invalid:outline aria-invalid:outline-2 aria-invalid:outline-danger"
        />
      </label>
    </div>
  )
}
