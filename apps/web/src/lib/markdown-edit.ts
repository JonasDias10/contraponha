export interface TextSelection {
  value: string
  start: number
  end: number
}

export interface EditResult {
  value: string
  selectionStart: number
  selectionEnd: number
}

export type MarkdownAction = "bold" | "italic" | "list" | "quote" | "link"

export interface ApplyMarkdownParams {
  selection: TextSelection
  action: MarkdownAction
  linkPlaceholder: string
}

interface MarkerParams {
  selection: TextSelection
  marker: string
}

function wrap({ selection, marker }: MarkerParams): EditResult {
  const { value, start, end } = selection
  const selected = value.slice(start, end)

  return {
    value: `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`,
    selectionStart: start + marker.length,
    selectionEnd: end + marker.length,
  }
}

function prefixLines({ selection, marker: prefix }: MarkerParams): EditResult {
  const { value, start, end } = selection
  const lineStart = value.lastIndexOf("\n", start - 1) + 1
  const block = value.slice(lineStart, end)

  const prefixed = block
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join("\n")

  return {
    value: `${value.slice(0, lineStart)}${prefixed}${value.slice(end)}`,
    selectionStart: lineStart,
    selectionEnd: lineStart + prefixed.length,
  }
}

// What the composer's toolbar buttons do to the text: plain Markdown, so what people type
// is exactly what gets stored and rendered.
export function applyMarkdown({
  selection,
  action,
  linkPlaceholder,
}: ApplyMarkdownParams): EditResult {
  switch (action) {
    case "bold":
      return wrap({ selection, marker: "**" })
    case "italic":
      return wrap({ selection, marker: "_" })
    case "list":
      return prefixLines({ selection, marker: "- " })
    case "quote":
      return prefixLines({ selection, marker: "> " })
    case "link": {
      const { value, start, end } = selection
      const text = value.slice(start, end) || linkPlaceholder
      const inserted = `[${text}](https://)`

      return {
        value: `${value.slice(0, start)}${inserted}${value.slice(end)}`,
        selectionStart: start + text.length + 3,
        selectionEnd: start + inserted.length - 1,
      }
    }
  }
}
