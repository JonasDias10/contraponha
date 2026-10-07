export type MarkdownFormat = "bold" | "italic" | "list" | "quote" | "link"

export interface TextSelection {
  start: number
  end: number
}

export interface ApplyFormatParams {
  text: string
  selection: TextSelection
  format: MarkdownFormat
  url?: string
}

export interface FormattedText {
  text: string
  selection: TextSelection
}

const WRAPPERS = { bold: "**", italic: "_" } as const

interface LineStartParams {
  text: string
  index: number
}

function lineStart({ text, index }: LineStartParams): number {
  return text.lastIndexOf("\n", index - 1) + 1
}

// Inline formats wrap the selection; block formats prefix every selected line.
export function applyMarkdownFormat({
  text,
  selection,
  format,
  url,
}: ApplyFormatParams): FormattedText {
  const before = text.slice(0, selection.start)
  const selected = text.slice(selection.start, selection.end)
  const after = text.slice(selection.end)

  if (format === "bold" || format === "italic") {
    const mark = WRAPPERS[format]

    return {
      text: `${before}${mark}${selected}${mark}${after}`,
      selection: { start: selection.start + mark.length, end: selection.end + mark.length },
    }
  }

  if (format === "link") {
    const label = selected || url || ""
    const link = `[${label}](${url ?? ""})`

    return {
      text: `${before}${link}${after}`,
      selection: { start: selection.start + link.length, end: selection.start + link.length },
    }
  }

  const prefix = format === "list" ? "- " : "> "
  const blockStart = lineStart({ text, index: selection.start })
  const block = text.slice(blockStart, selection.end)

  const prefixed = block
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join("\n")

  const added = prefixed.length - block.length

  return {
    text: `${text.slice(0, blockStart)}${prefixed}${after}`,
    selection: { start: selection.start + prefix.length, end: selection.end + added },
  }
}
