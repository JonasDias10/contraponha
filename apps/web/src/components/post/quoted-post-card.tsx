import type { QuotedPostView } from "@contraponha/types"
import { Avatar, useI18n, VerifiedBadge } from "@contraponha/web-ui"
import Link from "next/link"

import { paths } from "@/lib/paths"

export interface QuotedPostCardProps {
  quoted: QuotedPostView
}

// The post a quote refers to, compact and linked; a removed original leaves only a note.
export function QuotedPostCard({ quoted }: QuotedPostCardProps): React.JSX.Element {
  const { t } = useI18n()

  if (quoted.isDeleted || !quoted.author) {
    return (
      <p className="rounded-md border border-line bg-surface-sunken px-4 py-3 text-sm text-muted">
        {t("web.repost.removed")}
      </p>
    )
  }

  const { author } = quoted

  return (
    <Link
      href={paths.post(quoted.id)}
      className="flex flex-col gap-1.5 rounded-md border border-line px-4 py-3 text-ink no-underline hover:bg-surface-sunken"
    >
      <span className="flex items-center gap-2 text-sm">
        <Avatar id={author.id} name={author.displayName} src={author.avatarUrl} size="xs" />
        <span className="font-semibold">{author.displayName}</span>
        <VerifiedBadge verification={author.verification} />
        <span className="text-subtle">@{author.handle}</span>
      </span>
      {quoted.title ? (
        <span className="font-serif text-[17px] font-semibold">{quoted.title}</span>
      ) : null}
      {quoted.excerpt ? (
        <span className="line-clamp-4 font-serif text-[15px]/relaxed text-muted">
          {quoted.excerpt}
        </span>
      ) : null}
    </Link>
  )
}
