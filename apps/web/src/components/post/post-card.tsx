"use client"

import type { FeedReason, PostView } from "@ponto/types"
import { History, Info, Pin } from "lucide-react"
import Link from "next/link"

import { AuthorLine } from "@/components/post/author-line"
import { Markdown } from "@/components/post/markdown"
import { MediaGrid } from "@/components/post/media-grid"
import { PostActions } from "@/components/post/post-actions"
import { PostMenu } from "@/components/post/post-menu"
import { ReactionSummary } from "@/components/post/reaction-bar"
import { RemovedNotice } from "@/components/post/removed-notice"
import { SourceCard } from "@/components/post/source-card"
import { topicLabel } from "@/components/post/topic-tags"
import { useI18n } from "@/components/providers/i18n-provider"
import { HighlightedText } from "@/components/search/highlighted-text"
import { useReactions } from "@/hooks/use-reactions"
import { readingMinutes } from "@/lib/format"
import { paths } from "@/lib/paths"

const EXCERPT_LENGTH = 320

export interface PostCardProps {
  post: PostView
  reason?: FeedReason | null
  highlight?: string | null
}

interface WhyLineProps {
  reason: FeedReason
}

function WhyLine({ reason }: WhyLineProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <p className="flex items-center gap-1.5 text-[12.5px] text-subtle">
      <Info aria-hidden className="size-3.5" />
      {reason.topic
        ? t("web.feed.whyFollowedTopic", { topic: topicLabel(reason.topic) })
        : t("web.feed.whyFeatured")}
    </p>
  )
}

// The feed reads like a magazine: a flat card where the text takes most of the space.
export function PostCard({ post, reason, highlight }: PostCardProps): React.JSX.Element {
  const { t } = useI18n()

  const reactions = useReactions({
    targetType: "post",
    targetId: post.id,
    postId: post.id,
    initialReactions: post.viewer?.reactions ?? [],
    initialCounts: post.reactionCounts,
  })

  if (post.isDeleted) {
    return (
      <article className="rounded-lg border border-line bg-surface-raised p-5">
        <RemovedNotice removedBy={post.removedBy} rule={post.removalRule} subject="post" />
      </article>
    )
  }

  const body = post.body ?? ""
  const isTruncated = body.length > EXCERPT_LENGTH
  const [firstSource] = post.sources

  return (
    <article className="flex flex-col gap-3.5 rounded-lg border border-line bg-surface-raised p-5">
      {reason ? <WhyLine reason={reason} /> : null}
      {post.isPinned ? (
        <p className="flex items-center gap-1.5 text-[12.5px] text-subtle">
          <Pin aria-hidden className="size-3.5" />
          {t("web.post.pinned")}
        </p>
      ) : null}
      <AuthorLine
        author={post.author}
        createdAt={post.createdAt}
        extra={
          post.editedAt ? (
            <Link
              href={paths.post(post.id)}
              className="inline-flex items-center gap-1 text-subtle underline decoration-dotted underline-offset-[3px]"
            >
              <History aria-hidden className="size-3.5" />
              {t("web.post.edited")}
            </Link>
          ) : undefined
        }
        trailing={<PostMenu post={post} />}
      />
      {post.title ? (
        <h2 className="font-serif text-[21px] font-semibold leading-[1.3] tracking-[-0.01em]">
          <Link href={paths.post(post.id)} className="text-ink no-underline hover:underline">
            {post.title}
          </Link>
        </h2>
      ) : null}
      <Link href={paths.post(post.id)} className="text-ink no-underline">
        {highlight ? (
          <p className="whitespace-pre-line font-serif text-[17px] leading-[1.62]">
            <HighlightedText text={highlight} />
          </p>
        ) : (
          <Markdown text={body} isInsideLink className="line-clamp-8 text-[17px] leading-[1.62]" />
        )}
      </Link>
      {isTruncated ? (
        <Link href={paths.post(post.id)} className="text-sm font-semibold text-brand no-underline">
          {t("web.post.readMore", { minutes: readingMinutes(body) })}
        </Link>
      ) : null}
      <MediaGrid media={post.media} altPrefix={t("web.composer.image")} />
      {firstSource ? <SourceCard source={firstSource} /> : null}
      <ReactionSummary counts={reactions.counts} commentCount={post.commentCount} />
      <PostActions post={post} reactions={reactions} />
    </article>
  )
}
