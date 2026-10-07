import { queryKeys } from "@contraponha/client-core"
import type { CommentView } from "@contraponha/types"
import { useInfiniteQuery } from "@tanstack/react-query"
import { ChevronDown, MessageSquareReply, Star } from "lucide-react-native"
import { useState } from "react"
import { Pressable, StyleSheet, View } from "react-native"

import { CommentComposer } from "@/components/discussion/comment-composer"
import { CommentMenu } from "@/components/discussion/comment-menu"
import { commentActionStyle, CommentReactions } from "@/components/discussion/comment-reactions"
import { AuthorLine } from "@/components/post/author-line"
import { Markdown } from "@/components/post/markdown"
import { RemovedNotice } from "@/components/post/removed-notice"
import { SourceCard } from "@/components/post/source-card"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { radius, space } from "@/lib/theme"

const FIRST_PAGE: string | undefined = undefined

export interface CommentItemProps {
  comment: CommentView
  postAuthorId: string | undefined
  isReply?: boolean
}

interface CommentRepliesProps {
  comment: CommentView
  postAuthorId: string | undefined
  isOpen: boolean
  onOpen: () => void
}

function CommentReplies({
  comment,
  postAuthorId,
  isOpen,
  onOpen,
}: CommentRepliesProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const palette = usePalette()

  const replies = useInfiniteQuery({
    queryKey: queryKeys.replies(comment.id),
    queryFn: ({ pageParam }) =>
      api.comments.listReplies({ commentId: comment.id, query: { cursor: pageParam } }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: isOpen,
  })

  const items = isOpen ? (replies.data?.pages.flatMap((page) => page.items) ?? []) : []

  return (
    <View style={[styles.replies, { borderLeftColor: palette.line }]}>
      {items.map((reply) => (
        <CommentItem key={reply.id} comment={reply} postAuthorId={postAuthorId} isReply />
      ))}
      {!isOpen || replies.hasNextPage ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => (isOpen ? void replies.fetchNextPage() : onOpen())}
          style={styles.more}
        >
          <ChevronDown size={16} color={palette.brand} />
          <AppText variant="smallStrong" tone="brand">
            {t("web.comment.moreReplies", { count: comment.replyCount - items.length })}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  )
}

export function CommentItem({
  comment,
  postAuthorId,
  isReply = false,
}: CommentItemProps): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const [isReplying, setIsReplying] = useState(false)
  const [isShowingReplies, setIsShowingReplies] = useState(false)

  const content = (
    <>
      <AuthorLine
        author={comment.author}
        createdAt={comment.createdAt}
        size="sm"
        isPostAuthor={comment.isByPostAuthor || comment.author?.id === postAuthorId}
      />
      {comment.isDeleted ? (
        <RemovedNotice removedBy={comment.removedBy} rule={comment.removalRule} subject="comment" />
      ) : (
        <>
          <Markdown text={comment.body ?? ""} fontSize={16} />
          {comment.sources.map((source) => (
            <SourceCard key={source.url} source={source} />
          ))}
        </>
      )}
    </>
  )

  return (
    <View style={styles.item}>
      {comment.highlight ? (
        <View style={[styles.highlight, { backgroundColor: palette.accentSoft }]}>
          <View style={styles.highlightLabel}>
            <Star size={16} color={palette.accent} />
            <AppText variant="caption" tone="accent" style={styles.bold}>
              {t("web.comment.highlightedBy")}
              {comment.highlight.note ? ` · ${comment.highlight.note}` : ""}
            </AppText>
          </View>
          {content}
        </View>
      ) : (
        content
      )}
      {comment.isDeleted ? null : (
        <View style={styles.actions}>
          <CommentReactions comment={comment} />
          {isReply ? null : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsReplying((value) => !value)}
              style={({ pressed }) => [
                commentActionStyle,
                pressed && { backgroundColor: palette.surfaceSunken },
              ]}
            >
              <MessageSquareReply size={16} color={palette.muted} />
              <AppText variant="small" tone="muted">
                {comment.replyCount > 0
                  ? t("web.comment.replies", { count: comment.replyCount })
                  : t("web.comment.reply")}
              </AppText>
            </Pressable>
          )}
          <CommentMenu comment={comment} postAuthorId={postAuthorId} />
        </View>
      )}
      {isReplying ? (
        <CommentComposer
          postId={comment.postId}
          parentId={comment.id}
          isAutoFocused
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
    </View>
  )
}

const styles = StyleSheet.create({
  item: { gap: space.sm, paddingTop: space.lg },
  highlight: { gap: space.sm, padding: 14, borderRadius: radius.md + 2 },
  highlightLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
  bold: { fontWeight: "600" },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginLeft: -10 },
  replies: { borderLeftWidth: 2, paddingLeft: space.md, marginLeft: space.xs },
  more: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10 },
})
