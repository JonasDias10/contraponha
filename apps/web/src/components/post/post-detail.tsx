"use client"

import type { PostView } from "@contraponha/types"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Bookmark, History, Share } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Discussion } from "@/components/discussion/discussion"
import { AuthorLine } from "@/components/post/author-line"
import { Markdown } from "@/components/post/markdown"
import { MediaGrid } from "@/components/post/media-grid"
import { PostMenu } from "@/components/post/post-menu"
import { ReactionBar } from "@/components/post/reaction-bar"
import { RemovedNotice } from "@/components/post/removed-notice"
import { SourceCard } from "@/components/post/source-card"
import { TopicTags } from "@/components/post/topic-tags"
import { FollowButton } from "@/components/profile/follow-button"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { Button } from "@/components/ui/button"
import { Banner } from "@/components/ui/surfaces"
import { useBookmarkMutation } from "@/hooks/use-post-mutations"
import { useReactions } from "@/hooks/use-reactions"
import { cn } from "@/lib/cn"
import { formatDateTime, readingMinutes } from "@/lib/format"
import { queryKeys } from "@/lib/query-keys"

export interface PostDetailProps {
  postId: string
}

export function PostDetail({ postId }: PostDetailProps): React.JSX.Element | null {
  const api = useApi()

  const { data: post } = useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => api.posts.get(postId),
  })

  if (!post) return null

  return <PostArticle key={`${post.id}-${post.editedAt ?? ""}`} post={post} />
}

interface PostArticleProps {
  post: PostView
}

function PostArticle({ post }: PostArticleProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const viewer = useViewer()
  const router = useRouter()
  const bookmark = useBookmarkMutation()

  const isBookmarked = bookmark.isPending
    ? bookmark.variables.isSaving
    : (post.viewer?.isBookmarked ?? false)

  const reactions = useReactions({
    targetType: "post",
    targetId: post.id,
    postId: post.id,
    initialReactions: post.viewer?.reactions ?? [],
    initialCounts: post.reactionCounts,
  })

  const share = async (): Promise<void> => {
    await navigator.clipboard.writeText(window.location.href)

    toast(t("web.common.copied"))
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" className="-ml-2.5 self-start px-2.5" onClick={() => router.back()}>
        <ArrowLeft aria-hidden className="size-5" />
        {t("web.post.back")}
      </Button>
      {post.isDeleted ? (
        <RemovedNotice removedBy={post.removedBy} rule={post.removalRule} subject="post" />
      ) : (
        <article className="flex flex-col gap-5">
          {post.contextNote ? (
            <Banner tone="warning">
              <p className="font-semibold">{t("web.post.contextTitle")}</p>
              <p>{post.contextNote.body}</p>
              {post.contextNote.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="font-semibold text-brand"
                >
                  {source.title ?? source.host}
                </a>
              ))}
            </Banner>
          ) : null}
          <AuthorLine
            author={post.author}
            createdAt={post.createdAt}
            size="lg"
            trailing={
              <div className="flex items-center gap-1">
                {post.author && viewer && viewer.id !== post.author.id ? (
                  <FollowButton handle={post.author.handle} size="sm" />
                ) : null}
                <PostMenu post={post} afterDelete={() => router.push("/home")} />
              </div>
            }
          />
          {post.title ? (
            <h1 className="font-serif text-3xl/tight font-semibold tracking-[-0.015em] md:text-[38px]">
              {post.title}
            </h1>
          ) : null}
          <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-subtle">
            <span>{formatDateTime({ value: post.createdAt, locale })}</span>
            <span aria-hidden>·</span>
            <span>{t("web.post.readingTime", { minutes: readingMinutes(post.body ?? "") })}</span>
            {post.editedAt ? (
              <>
                <span aria-hidden>·</span>
                <a
                  href="#history"
                  className="inline-flex items-center gap-1 text-brand underline decoration-dotted underline-offset-[3px]"
                >
                  <History aria-hidden className="size-3.5" />
                  {t("web.post.editedAt", {
                    time: formatDateTime({ value: post.editedAt, locale }),
                  })}
                </a>
              </>
            ) : null}
          </p>
          <Markdown text={post.body ?? ""} className="text-[19px] leading-[1.68]" />
          <MediaGrid media={post.media} altPrefix={t("web.composer.image")} />
          {post.sources.length > 0 ? (
            <div className="flex flex-col gap-2">
              <h2 className="sr-only">{t("web.post.sourcesLabel")}</h2>
              {post.sources.map((source) => (
                <SourceCard key={source.url} source={source} />
              ))}
            </div>
          ) : null}
          <TopicTags topics={post.topics} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            {viewer ? (
              <ReactionBar
                reactions={reactions.reactions}
                counts={reactions.counts}
                onToggle={reactions.toggle}
              />
            ) : (
              <Link href="/login" className="text-sm text-brand underline">
                {t("web.reactions.signIn")}
              </Link>
            )}
            <div className="flex gap-1">
              {viewer ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-pressed={isBookmarked}
                  aria-label={isBookmarked ? t("web.post.unsave") : t("web.post.save")}
                  onClick={() => bookmark.mutate({ postId: post.id, isSaving: !isBookmarked })}
                  className={cn(isBookmarked && "text-brand")}
                >
                  <Bookmark aria-hidden className={cn("size-5", isBookmarked && "fill-current")} />
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                aria-label={t("web.post.share")}
                onClick={() => void share()}
              >
                <Share aria-hidden className="size-5" />
              </Button>
            </div>
          </div>
        </article>
      )}
      <Discussion
        postId={post.id}
        postAuthorId={post.author?.id}
        commentCount={post.commentCount}
        canReply={!post.isDeleted && (post.viewer?.canReply ?? true)}
      />
    </div>
  )
}
