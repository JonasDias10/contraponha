import ReactMarkdown, { type Components } from "react-markdown"

import { cn } from "@contraponha/web-ui"

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

// Inside a card that is itself a link, nested anchors are invalid HTML.
const INSIDE_LINK_COMPONENTS: Components = {
  a: ({ children }) => <span className="text-brand">{children}</span>,
}

export interface MarkdownProps {
  text: string
  className?: string
  isInsideLink?: boolean
}

// People write in a small Markdown subset. Raw HTML is never rendered and unsafe link
// protocols are dropped by react-markdown; anything else is unwrapped to plain text.
export function Markdown({
  text,
  className,
  isInsideLink = false,
}: MarkdownProps): React.JSX.Element {
  return (
    <div className={cn("prose-read", className)}>
      <ReactMarkdown
        allowedElements={ALLOWED_ELEMENTS}
        unwrapDisallowed
        components={isInsideLink ? INSIDE_LINK_COMPONENTS : COMPONENTS}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
