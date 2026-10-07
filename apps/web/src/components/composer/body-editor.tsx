"use client"

import { Placeholder } from "@tiptap/extensions"
import { Markdown as MarkdownSerializer } from "@tiptap/markdown"
import { EditorContent, useEditor } from "@tiptap/react"
import { StarterKit } from "@tiptap/starter-kit"
import { useEffect } from "react"

import { BodyToolbar } from "@/components/composer/body-toolbar"
import { Markdown } from "@/components/post/markdown"
import { useI18n } from "@/components/providers/i18n-provider"

export interface BodyEditorProps {
  value: string
  onChange: (value: string) => void
  isPreviewing: boolean
  isInvalid: boolean
  extraTools?: React.ReactNode
}

// The toolbar only offers what the post renderer shows, but headings, strikethrough and
// code blocks stay in the schema: without them, older bodies that use that syntax would
// load as an empty document and be wiped on save. Underline has no Markdown form.
const FORMATTING = StarterKit.configure({
  underline: false,
  link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
})

export function BodyEditor({
  value,
  onChange,
  isPreviewing,
  isInvalid,
  extraTools,
}: BodyEditorProps): React.JSX.Element {
  const { t } = useI18n()

  const editor = useEditor({
    extensions: [
      FORMATTING,
      Placeholder.configure({ placeholder: t("web.composer.bodyPlaceholder") }),
      MarkdownSerializer,
    ],
    content: value,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": t("web.composer.bodyPlaceholder"),
        class:
          "prose-read min-h-60 text-[19px] leading-[1.65] focus-visible:outline-none aria-invalid:rounded-md aria-invalid:outline aria-invalid:outline-2 aria-invalid:outline-danger",
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getMarkdown()),
  })

  useEffect(() => {
    editor?.view.dom.setAttribute("aria-invalid", String(isInvalid))
  }, [editor, isInvalid])

  // Picks up values set from outside, such as a restored draft.
  useEffect(() => {
    if (!editor || editor.getMarkdown() === value) return

    editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false })
  }, [editor, value])

  if (isPreviewing) return <Markdown text={value} className="min-h-60 text-[19px] leading-[1.65]" />

  return (
    <div className="flex flex-col gap-4">
      {editor ? <BodyToolbar editor={editor} extraTools={extraTools} /> : null}
      <EditorContent editor={editor} />
    </div>
  )
}
