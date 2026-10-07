import type { ContentSource } from "@ponto/types"
import { BookText, ChevronRight } from "lucide-react"

export interface SourceCardProps {
  source: ContentSource
  action?: React.ReactNode
}

// A cited source is a first-class block, not a link lost in the text.
export function SourceCard({ source, action }: SourceCardProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-line bg-surface px-3.5 py-3">
      <BookText aria-hidden className="size-5 flex-none text-muted" />
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="flex min-w-0 flex-1 flex-col text-ink no-underline"
      >
        <span className="truncate text-sm font-semibold leading-snug">
          {source.title ?? source.url}
        </span>
        <span className="truncate text-[12.5px] text-subtle">{source.host}</span>
      </a>
      {action ?? <ChevronRight aria-hidden className="size-5 flex-none text-subtle" />}
    </div>
  )
}
