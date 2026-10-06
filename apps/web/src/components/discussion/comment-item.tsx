"use client"

import type { CommentView, CommunityRule } from "@ponto/types"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ChevronDown,
  CircleCheck,
  Flag,
  MessageSquareReply,
  MoreHorizontal,
  ShieldX,
  Star,
  StarOff,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { CommentComposer } from "@/components/discussion/comment-composer"
import { HighlightDialog } from "@/components/discussion/highlight-dialog"
import { AuthorLine } from "@/components/post/author-line"
import { Markdown } from "@/components/post/markdown"
import { REACTION_ICONS, REACTION_ORDER } from "@/components/post/reaction-bar"
import { RemovedNotice } from "@/components/post/removed-notice"
import { ReportDialog } from "@/components/post/report-dialog"
import { RuleSelect } from "@/components/post/rule-select"
import { SourceCard } from "@/components/post/source-card"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { Avatar } from "@/components/ui/avatar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlays"
import { useRemoveContentMutation } from "@/hooks/use-moderation"
import { useReactions } from "@/hooks/use-reactions"
import { errorMessage } from "@/lib/api-errors"
import { cn } from "@/lib/cn"
import { canModerate } from "@/lib/roles"
import { queryKeys } from "@/lib/query-keys"

const actClasses =
  "inline-flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-medium text-muted hover:bg-surface-sunken"

const FIRST_PAGE: string | undefined = undefined

type OpenDialog = "delete" | "report" | "highlight" | "remove" | null

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
  const api = useApi()
  const viewer = useViewer()
  const queryClient = useQueryClient()
  const [isReplying, setIsReplying] = useState(false)
  const [isShowingReplies, setIsShowingReplies] = useState(false)
  const [dialog, setDialog] = useState<OpenDialog>(null)
  const [rule, setRule] = useState<CommunityRule>()
  const moderate = useRemoveContentMutation()
  const isOwner = viewer?.id === comment.author?.id
  const isPostAuthor = viewer !== null && viewer.id === postAuthorId
  const isModerator = canModerate(viewer)

  const reactions = useReactions({
    targetType: "comment",
    targetId: comment.id,
    postId: comment.postId,
    initialReactions: comment.viewer?.reactions ?? [],
    initialCounts: comment.reactionCounts,
  })

  const replies = useInfiniteQuery({
    queryKey: queryKeys.replies(comment.id),
    queryFn: ({ pageParam }) =>
      api.comments.listReplies({ commentId: comment.id, query: { cursor: pageParam } }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: isShowingReplies,
  })

  const refresh = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.commentsOfPost(comment.postId) })

  const remove = useMutation({
    mutationFn: () => api.comments.delete(comment.id),
    onSuccess: async () => {
      toast.success(t("web.comment.deleted"))

      setDialog(null)

      await refresh()
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const unhighlight = useMutation({
    mutationFn: () => api.comments.unhighlight(comment.id),
    onSuccess: refresh,
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  const replyItems = replies.data?.pages.flatMap((page) => page.items) ?? []

  const visibleReactions = REACTION_ORDER.filter(
    (kind) => reactions.counts[kind] > 0 || reactions.reactions.includes(kind),
  )

  const content = comment.isDeleted ? (
    <RemovedNotice removedBy={comment.removedBy} rule={comment.removalRule} subject="comment" />
  ) : (
    <>
      <Markdown text={comment.body ?? ""} className="text-base leading-[1.6]" />
      {comment.sources.map((source) => (
        <SourceCard key={source.url} source={source} />
      ))}
    </>
  )

  return (
    <div id={`c-${comment.id}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 pt-4">
      <div className="flex flex-col items-center gap-1.5">
        {comment.author && !comment.author.isDeleted ? (
          <Avatar id={comment.author.id} name={comment.author.displayName} size="sm" />
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
            <CommentHeader comment={comment} postAuthorId={postAuthorId} />
            {content}
          </div>
        ) : (
          <>
            <CommentHeader comment={comment} postAuthorId={postAuthorId} />
            {content}
          </>
        )}
        {comment.isDeleted ? null : (
          <div className="-ml-2.5 flex flex-wrap items-center gap-0.5">
            {visibleReactions.length > 0
              ? visibleReactions.map((kind) => {
                  const Icon = REACTION_ICONS[kind]
                  const isOn = reactions.reactions.includes(kind)

                  return (
                    <button
                      key={kind}
                      type="button"
                      aria-pressed={isOn}
                      disabled={!viewer}
                      onClick={() => reactions.toggle(kind)}
                      className={cn(actClasses, isOn && "font-semibold text-brand")}
                    >
                      <Icon aria-hidden className="size-4" />
                      {t(`web.reactions.${kind}`)} · {reactions.counts[kind]}
                    </button>
                  )
                })
              : null}
            {viewer ? (
              <Menu>
                <MenuTrigger className={actClasses}>
                  <CircleCheck aria-hidden className="size-4" />
                  {t("web.post.react")}
                </MenuTrigger>
                <MenuContent align="start">
                  {REACTION_ORDER.map((kind) => {
                    const Icon = REACTION_ICONS[kind]

                    return (
                      <MenuItem key={kind} onSelect={() => reactions.toggle(kind)}>
                        <Icon
                          aria-hidden
                          className={cn(
                            "size-4",
                            reactions.reactions.includes(kind) && "text-brand",
                          )}
                        />
                        {t(`web.reactions.${kind}`)}
                      </MenuItem>
                    )
                  })}
                </MenuContent>
              </Menu>
            ) : null}
            {viewer && !isReply ? (
              <button
                type="button"
                className={actClasses}
                onClick={() => setIsReplying((value) => !value)}
              >
                <MessageSquareReply aria-hidden className="size-4" />
                {comment.replyCount > 0
                  ? t("web.comment.replies", { count: comment.replyCount })
                  : t("web.comment.reply")}
              </button>
            ) : null}
            {viewer ? (
              <Menu>
                <MenuTrigger
                  aria-label={t("web.comment.options")}
                  className={cn(actClasses, "px-2")}
                >
                  <MoreHorizontal aria-hidden className="size-4" />
                </MenuTrigger>
                <MenuContent>
                  {isPostAuthor && !isOwner ? (
                    comment.highlight ? (
                      <MenuItem onSelect={() => unhighlight.mutate()}>
                        <StarOff aria-hidden className="size-4" />
                        {t("web.comment.unhighlight")}
                      </MenuItem>
                    ) : (
                      <MenuItem onSelect={() => setDialog("highlight")}>
                        <Star aria-hidden className="size-4" />
                        {t("web.comment.highlight")}
                      </MenuItem>
                    )
                  ) : null}
                  {isOwner ? (
                    <MenuItem tone="danger" onSelect={() => setDialog("delete")}>
                      <Trash2 aria-hidden className="size-4" />
                      {t("web.common.delete")}
                    </MenuItem>
                  ) : (
                    <MenuItem tone="danger" onSelect={() => setDialog("report")}>
                      <Flag aria-hidden className="size-4" />
                      {t("web.post.report")}
                    </MenuItem>
                  )}
                  {isModerator ? (
                    <MenuItem tone="danger" onSelect={() => setDialog("remove")}>
                      <ShieldX aria-hidden className="size-4" />
                      {t("web.moderation.removeComment")}
                    </MenuItem>
                  ) : null}
                </MenuContent>
              </Menu>
            ) : null}
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
          <div>
            {isShowingReplies
              ? replyItems.map((reply, index) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    postAuthorId={postAuthorId}
                    isLast={index === replyItems.length - 1 && !replies.hasNextPage}
                    isReply
                  />
                ))
              : null}
            {!isShowingReplies || replies.hasNextPage ? (
              <button
                type="button"
                onClick={() =>
                  isShowingReplies ? void replies.fetchNextPage() : setIsShowingReplies(true)
                }
                className="inline-flex items-center gap-1.5 py-2.5 text-sm font-semibold text-brand"
              >
                <ChevronDown aria-hidden className="size-4" />
                {t("web.comment.moreReplies", { count: comment.replyCount - replyItems.length })}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("web.comment.deleteTitle")}
        description={comment.body?.slice(0, 200) ?? ""}
        confirmLabel={t("web.common.delete")}
        isPending={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
      <ConfirmDialog
        open={dialog === "remove"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={t("web.moderation.removeTitle")}
        description={comment.body?.slice(0, 200) ?? ""}
        confirmLabel={t("web.moderation.removeComment")}
        isPending={moderate.isPending}
        onConfirm={() => {
          if (rule) {
            moderate.mutate(
              { targetType: "comment", targetId: comment.id, rule },
              { onSuccess: () => setDialog(null) },
            )
          }
        }}
      >
        <RuleSelect value={rule} onChange={setRule} />
      </ConfirmDialog>
      <ReportDialog
        targetType="comment"
        targetId={comment.id}
        excerpt={comment.body?.slice(0, 200)}
        open={dialog === "report"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <HighlightDialog
        commentId={comment.id}
        postId={comment.postId}
        open={dialog === "highlight"}
        onOpenChange={(open) => !open && setDialog(null)}
      />
    </div>
  )
}

interface CommentHeaderProps {
  comment: CommentView
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
