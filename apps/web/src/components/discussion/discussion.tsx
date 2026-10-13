"use client"

import { CommentSort } from "@contraponha/types"
import { useInfiniteQuery } from "@tanstack/react-query"
import { MessageSquare } from "lucide-react"
import { useState } from "react"
import { queryKeys } from "@contraponha/client-core"
import { usePendingComments, usePostRealtime } from "@contraponha/client-core/react"

import { CommentComposer } from "@/components/discussion/comment-composer"
import { CommentItem } from "@/components/discussion/comment-item"
import { NewItemsPill } from "@/components/feed/new-items-pill"
import {
  Banner,
  Button,
  EmptyState,
  Segmented,
  SegmentedItem,
  SegmentedList,
  Skeleton,
  useApi,
  useI18n,
  useViewer,
} from "@contraponha/web-ui"

const FIRST_PAGE: string | undefined = undefined

export interface DiscussionProps {
  postId: string
  postAuthorId: string | undefined
  commentCount: number
  canReply: boolean
}

function isSort(value: string): value is CommentSort {
  return value === CommentSort.RELEVANT || value === CommentSort.RECENT
}

export function Discussion({
  postId,
  postAuthorId,
  commentCount,
  canReply,
}: DiscussionProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const [sort, setSort] = useState<CommentSort>(CommentSort.RELEVANT)
  const pending = usePendingComments(postId)

  usePostRealtime({ postId, isEnabled: viewer !== null })

  const query = useInfiniteQuery({
    queryKey: queryKeys.comments({ postId, sort }),
    queryFn: ({ pageParam }) =>
      api.comments.listForPost({ postId, query: { sort, cursor: pageParam } }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const comments = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <section
      id="discussion"
      aria-labelledby="discussion-title"
      className="flex scroll-mt-6 flex-col gap-4 border-t border-line pt-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="discussion-title" className="font-serif text-[25px] font-semibold">
            {t("web.post.discussion")}
          </h2>
          <p className="text-[13px] text-subtle">
            {sort === CommentSort.RELEVANT
              ? t("web.post.discussionMeta", { count: commentCount })
              : t("web.post.discussionMetaRecent", { count: commentCount })}
          </p>
        </div>
        <Segmented value={sort} onValueChange={(value) => isSort(value) && setSort(value)}>
          <SegmentedList>
            <SegmentedItem value={CommentSort.RELEVANT}>{t("web.post.sortRelevant")}</SegmentedItem>
            <SegmentedItem value={CommentSort.RECENT}>{t("web.post.sortRecent")}</SegmentedItem>
          </SegmentedList>
        </Segmented>
      </div>
      {pending.count > 0 ? (
        <NewItemsPill
          label={t("web.realtime.newComments", { count: pending.count })}
          onReveal={() => void pending.reveal()}
        />
      ) : null}
      {canReply ? (
        <CommentComposer postId={postId} />
      ) : (
        <Banner tone="neutral">{t("web.post.repliesRestricted")}</Banner>
      )}
      {query.isPending ? (
        <div aria-busy className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : comments.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="size-8" />}
          title={t("web.post.noContributions")}
        />
      ) : (
        <div className="flex flex-col">
          {comments.map((comment, index) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postAuthorId={postAuthorId}
              isLast={index === comments.length - 1}
            />
          ))}
        </div>
      )}
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          className="self-start"
          isLoading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("web.post.moreContributions")}
        </Button>
      ) : null}
    </section>
  )
}
