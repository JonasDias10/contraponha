"use client"

import type { FeedReason, PostView, PublicProfile } from "@contraponha/types"
import { History, Info, Pin, Repeat2 } from "lucide-react"
import Link from "next/link"
import { readingMinutes, topicLabel } from "@contraponha/client-core"
import { useReactions } from "@contraponha/client-core/react"

import { AuthorLine } from "@/components/post/author-line"
import { LinkPreviewCard } from "@/components/post/link-preview-card"
import { Markdown } from "@/components/post/markdown"
import { MediaGrid } from "@/components/post/media-grid"
import { PostActions } from "@/components/post/post-actions"
import { PostMenu } from "@/components/post/post-menu"
import { QuotedPostCard } from "@/components/post/quoted-post-card"
import { ReactionSummary } from "@/components/post/reaction-bar"
import { RemovedNotice } from "@/components/post/removed-notice"
import { SourceCard } from "@/components/post/source-card"
import { useI18n } from "@contraponha/web-ui"
import { HighlightedText } from "@/components/search/highlighted-text"
import { paths } from "@/lib/paths"

const EXCERPT_LENGTH = 320

export interface PostCardProps {
  post: PostView
  reason?: FeedReason | null
  repostedBy?: PublicProfile | null
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
export function PostCard({
  post,
  reason,
  repostedBy,
  highlight,
}: PostCardProps): React.JSX.Element {
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
    <article className="flex animate-rise-in flex-col gap-3.5 rounded-lg border border-line bg-surface-raised p-5 transition-shadow hover:shadow-e1">
      {repostedBy ? (
        <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-subtle">
          <Repeat2 aria-hidden className="size-3.5" />
          {t("web.repost.repostedBy", { name: repostedBy.displayName })}
        </p>
      ) : null}
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
        <h2 className="font-serif text-[21px] leading-[1.3] font-semibold tracking-[-0.01em]">
          <Link href={paths.post(post.id)} className="text-ink no-underline hover:underline">
            {post.title}
          </Link>
        </h2>
      ) : null}
      <Link href={paths.post(post.id)} className="text-ink no-underline">
        {highlight ? (
          <p className="font-serif text-[17px] leading-[1.62] whitespace-pre-line">
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
      {post.quotedPost ? <QuotedPostCard quoted={post.quotedPost} /> : null}
      {post.linkPreview ? <LinkPreviewCard preview={post.linkPreview} /> : null}
      {firstSource && firstSource.url !== post.linkPreview?.url ? (
        <SourceCard source={firstSource} />
      ) : null}
      <ReactionSummary counts={reactions.counts} commentCount={post.commentCount} />
      <PostActions post={post} reactions={reactions} />
    </article>
  )
}
