"use client"

import type { CommentView } from "@contraponha/types"
import { useInfiniteQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"

import { CommentItem } from "@/components/discussion/comment-item"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { queryKeys } from "@/lib/query-keys"

const FIRST_PAGE: string | undefined = undefined

export interface CommentRepliesProps {
  comment: CommentView
  postAuthorId: string | undefined
  isOpen: boolean
  onOpen: () => void
}

export function CommentReplies({
  comment,
  postAuthorId,
  isOpen,
  onOpen,
}: CommentRepliesProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  const replies = useInfiniteQuery({
    queryKey: queryKeys.replies(comment.id),
    queryFn: ({ pageParam }) =>
      api.comments.listReplies({ commentId: comment.id, query: { cursor: pageParam } }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: isOpen,
  })

  const items = isOpen ? (replies.data?.pages.flatMap((page) => page.items) ?? []) : []

  const handleMore = (): void => {
    if (isOpen) {
      void replies.fetchNextPage()

      return
    }

    onOpen()
  }

  return (
    <div>
      {items.map((reply, index) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          postAuthorId={postAuthorId}
          isLast={index === items.length - 1 && !replies.hasNextPage}
          isReply
        />
      ))}
      {!isOpen || replies.hasNextPage ? (
        <button
          type="button"
          onClick={handleMore}
          className="inline-flex items-center gap-1.5 py-2.5 text-sm font-semibold text-brand"
        >
          <ChevronDown aria-hidden className="size-4" />
          {t("web.comment.moreReplies", { count: comment.replyCount - items.length })}
        </button>
      ) : null}
    </div>
  )
}
