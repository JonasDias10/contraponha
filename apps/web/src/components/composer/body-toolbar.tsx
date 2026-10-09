"use client"

import { useEditorState, type Editor } from "@tiptap/react"
import { Bold, Italic, List, Quote, type LucideIcon } from "lucide-react"

import { LinkPopover } from "@/components/composer/link-popover"
import { toolButtonClasses } from "@/components/composer/tool-button"
import { useI18n } from "@contraponha/web-ui"

type FormatName = "bold" | "italic" | "bulletList" | "blockquote"

interface Tool {
  format: FormatName
  label: "bold" | "italic" | "list" | "quote"
  Icon: LucideIcon
  toggle: (editor: Editor) => void
}

const TOOLS: Tool[] = [
  {
    format: "bold",
    label: "bold",
    Icon: Bold,
    toggle: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    format: "italic",
    label: "italic",
    Icon: Italic,
    toggle: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    format: "bulletList",
    label: "list",
    Icon: List,
    toggle: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    format: "blockquote",
    label: "quote",
    Icon: Quote,
    toggle: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
]

type ActiveFormats = Record<FormatName | "link", boolean>

export interface BodyToolbarProps {
  editor: Editor
  extraTools?: React.ReactNode
}

export function BodyToolbar({ editor, extraTools }: BodyToolbarProps): React.JSX.Element {
  const { t } = useI18n()

  const active = useEditorState({
    editor,
    selector: ({ editor: current }): ActiveFormats => ({
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      bulletList: current.isActive("bulletList"),
      blockquote: current.isActive("blockquote"),
      link: current.isActive("link"),
    }),
  })

  return (
    <div
      role="toolbar"
      aria-label={t("web.composer.toolbar")}
      className="flex items-center gap-0.5 self-start rounded-[12px] border border-line bg-surface-raised p-1"
    >
      {TOOLS.map(({ format, label, Icon, toggle }) => (
        <button
          key={format}
          type="button"
          aria-label={t(`web.composer.${label}`)}
          title={t(`web.composer.${label}`)}
          aria-pressed={active[format]}
          onClick={() => toggle(editor)}
          className={toolButtonClasses}
        >
          <Icon aria-hidden className="size-4.5" />
        </button>
      ))}
      <LinkPopover editor={editor} isActive={active.link} />
      {extraTools}
    </div>
  )
}
