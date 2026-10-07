import ReactMarkdown, { type Components } from "react-markdown"

import { cn } from "@/lib/cn"

const ALLOWED_ELEMENTS = [
  "p",
  "strong",
  "em",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "br",
  "code",
  "hr",
]

const COMPONENTS: Components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
      {children}
    </a>
  ),
}

export interface MarkdownProps {
  text: string
  className?: string
}

// People write in a small Markdown subset. Raw HTML is never rendered and unsafe link
// protocols are dropped by react-markdown; anything else is unwrapped to plain text.
export function Markdown({ text, className }: MarkdownProps): React.JSX.Element {
  return (
    <div className={cn("prose-read", className)}>
      <ReactMarkdown allowedElements={ALLOWED_ELEMENTS} unwrapDisallowed components={COMPONENTS}>
        {text}
      </ReactMarkdown>
    </div>
  )
}
