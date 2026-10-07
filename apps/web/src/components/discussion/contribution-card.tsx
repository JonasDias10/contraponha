"use client"

import type { ContributionView } from "@contraponha/types"
import { Star } from "lucide-react"
import Link from "next/link"

import { HighlightedText } from "@/components/search/highlighted-text"
import { AuthorLine } from "@/components/post/author-line"
import { Markdown } from "@/components/post/markdown"
import { ReactionSummary } from "@/components/post/reaction-bar"
import { useI18n } from "@/components/providers/i18n-provider"
import { paths } from "@/lib/paths"

export interface ContributionCardProps {
  contribution: ContributionView
  highlight?: string | null
}

// A contribution shown outside its discussion, with the post it answers.
export function ContributionCard({
  contribution,
  highlight,
}: ContributionCardProps): React.JSX.Element {
  const { t } = useI18n()
  const { comment, post } = contribution

  const where = post.title
    ? t("web.comment.inPost", { title: post.title })
    : t("web.comment.inUntitledPost", {
        author: post.author?.displayName ?? t("web.common.deletedAccount"),
      })

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-line bg-surface-raised p-5">
      <AuthorLine
        author={comment.author}
        createdAt={comment.createdAt}
        size="sm"
        extra={<span>{where}</span>}
      />
      {comment.highlight ? (
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-accent">
          <Star aria-hidden className="size-4" />
          {t("web.comment.highlightedBy")}
          {comment.highlight.note ? ` · ${comment.highlight.note}` : ""}
        </p>
      ) : null}
      <Link
        href={paths.comment({ postId: comment.postId, commentId: comment.id })}
        className="font-serif text-base/relaxed text-ink no-underline"
      >
        {highlight ? (
          <HighlightedText text={highlight} />
        ) : (
          <Markdown text={comment.body ?? ""} isInsideLink className="line-clamp-6" />
        )}
      </Link>
      <ReactionSummary counts={comment.reactionCounts} />
    </article>
  )
}
