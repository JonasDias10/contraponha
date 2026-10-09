"use client"

import type { CommentView } from "@contraponha/types"
import { MessageSquareReply, Star } from "lucide-react"
import { useState } from "react"

import { commentActionClasses } from "@/components/discussion/comment-actions"
import { CommentComposer } from "@/components/discussion/comment-composer"
import { CommentMenu } from "@/components/discussion/comment-menu"
import { CommentReactions } from "@/components/discussion/comment-reactions"
import { CommentReplies } from "@/components/discussion/comment-replies"
import { AuthorLine } from "@/components/post/author-line"
import { Markdown } from "@/components/post/markdown"
import { RemovedNotice } from "@/components/post/removed-notice"
import { SourceCard } from "@/components/post/source-card"
import { Avatar, useI18n, useViewer } from "@contraponha/web-ui"

export interface CommentItemProps {
  comment: CommentView
  postAuthorId: string | undefined
  isLast: boolean
  isReply?: boolean
}

export function CommentItem({
  comment,
  postAuthorId,
  isLast,
  isReply = false,
}: CommentItemProps): React.JSX.Element {
  const { t } = useI18n()
  const viewer = useViewer()
  const [isReplying, setIsReplying] = useState(false)
  const [isShowingReplies, setIsShowingReplies] = useState(false)

  const body = (
    <>
      <CommentHeader comment={comment} postAuthorId={postAuthorId} />
      <CommentContent comment={comment} />
    </>
  )

  return (
    <div id={`c-${comment.id}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 pt-4">
      <div className="flex flex-col items-center gap-1.5">
        {comment.author && !comment.author.isDeleted ? (
          <Avatar
            id={comment.author.id}
            name={comment.author.displayName}
            src={comment.author.avatarUrl}
            size="sm"
          />
        ) : (
          <span aria-hidden className="size-8 rounded-full bg-surface-sunken" />
        )}
        {!isLast || isShowingReplies ? (
          <span aria-hidden className="w-0.5 flex-1 rounded-full bg-line" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-1.5 pb-1.5">
        {comment.highlight ? (
          <div className="my-1 flex flex-col gap-2 rounded-[12px] bg-accent-soft px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-accent">
              <Star aria-hidden className="size-4" />
              {t("web.comment.highlightedBy")}
              {comment.highlight.note ? ` · ${comment.highlight.note}` : ""}
            </p>
            {body}
          </div>
        ) : (
          body
        )}
        {comment.isDeleted ? null : (
          <div className="-ml-2.5 flex flex-wrap items-center gap-0.5">
            <CommentReactions comment={comment} />
            {viewer && !isReply ? (
              <button
                type="button"
                className={commentActionClasses}
                onClick={() => setIsReplying((value) => !value)}
              >
                <MessageSquareReply aria-hidden className="size-4" />
                {comment.replyCount > 0
                  ? t("web.comment.replies", { count: comment.replyCount })
                  : t("web.comment.reply")}
              </button>
            ) : null}
            {viewer ? <CommentMenu comment={comment} postAuthorId={postAuthorId} /> : null}
          </div>
        )}
        {isReplying ? (
          <CommentComposer
            postId={comment.postId}
            parentId={comment.id}
            autoFocus
            onDone={() => {
              setIsReplying(false)

              setIsShowingReplies(true)
            }}
          />
        ) : null}
        {!isReply && comment.replyCount > 0 ? (
          <CommentReplies
            comment={comment}
            postAuthorId={postAuthorId}
            isOpen={isShowingReplies}
            onOpen={() => setIsShowingReplies(true)}
          />
        ) : null}
      </div>
    </div>
  )
}

interface CommentPartProps {
  comment: CommentView
}

function CommentContent({ comment }: CommentPartProps): React.JSX.Element {
  if (comment.isDeleted) {
    return (
      <RemovedNotice removedBy={comment.removedBy} rule={comment.removalRule} subject="comment" />
    )
  }

  return (
    <>
      <Markdown text={comment.body ?? ""} className="text-base leading-[1.6]" />
      {comment.sources.map((source) => (
        <SourceCard key={source.url} source={source} />
      ))}
    </>
  )
}

interface CommentHeaderProps extends CommentPartProps {
  postAuthorId: string | undefined
}

function CommentHeader({ comment, postAuthorId }: CommentHeaderProps): React.JSX.Element {
  return (
    <AuthorLine
      author={comment.author}
      createdAt={comment.createdAt}
      size="sm"
      hasAvatar={false}
      isPostAuthor={comment.isByPostAuthor || comment.author?.id === postAuthorId}
    />
  )
}
