import { queryKeys } from "@contraponha/client-core"
import { CommentSort, type CommentView } from "@contraponha/types"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams } from "expo-router"
import { MessageSquare } from "lucide-react-native"
import { useState } from "react"
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native"

import { CommentComposer } from "@/components/discussion/comment-composer"
import { CommentItem } from "@/components/discussion/comment-item"
import { InfiniteList } from "@/components/feed/infinite-list"
import { PostArticle } from "@/components/post/post-article"
import { Screen, ScreenHeader } from "@/components/ui/screen"
import { Segmented } from "@/components/ui/segmented"
import { Banner, EmptyState, ErrorView, LoadingView } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { space } from "@/lib/theme"

export default function PostScreen(): React.JSX.Element {
  const { postId } = useLocalSearchParams<{ postId: string }>()
  const { t } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const [sort, setSort] = useState<CommentSort>(CommentSort.RELEVANT)

  const query = useQuery({
    queryKey: queryKeys.post(postId),
    queryFn: () => api.posts.get(postId),
  })

  const post = query.data
  const canReply = post ? !post.isDeleted && (post.viewer?.canReply ?? true) : false

  const header = post ? (
    <View style={styles.header}>
      <PostArticle key={`${post.id}-${post.editedAt ?? ""}`} post={post} />
      <View style={[styles.discussion, { borderTopColor: palette.line }]}>
        <AppText variant="heading2" accessibilityRole="header">
          {t("web.post.discussion")}
        </AppText>
        <AppText variant="caption" tone="subtle">
          {sort === CommentSort.RELEVANT
            ? t("web.post.discussionMeta", { count: post.commentCount })
            : t("web.post.discussionMetaRecent", { count: post.commentCount })}
        </AppText>
        <Segmented
          value={sort}
          onChange={setSort}
          options={[
            { value: CommentSort.RELEVANT, label: t("web.post.sortRelevant") },
            { value: CommentSort.RECENT, label: t("web.post.sortRecent") },
          ]}
        />
        {canReply ? (
          <CommentComposer postId={post.id} />
        ) : (
          <Banner>{t("web.post.repliesRestricted")}</Banner>
        )}
      </View>
    </View>
  ) : undefined

  return (
    <Screen>
      <ScreenHeader />
      {query.isPending ? (
        <LoadingView />
      ) : query.isError || !post ? (
        <ErrorView onRetry={() => void query.refetch()} />
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.fill}
        >
          <InfiniteList<CommentView>
            key={sort}
            queryKey={queryKeys.comments({ postId, sort })}
            load={(cursor) => api.comments.listForPost({ postId, query: { sort, cursor } })}
            renderItem={({ item }) => <CommentItem comment={item} postAuthorId={post.author?.id} />}
            keyOf={(item) => item.id}
            header={header}
            empty={
              <EmptyState
                icon={<MessageSquare size={32} color={palette.muted} />}
                title={t("web.post.noContributions")}
              />
            }
          />
        </KeyboardAvoidingView>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { gap: space.xxl },
  discussion: { gap: space.md, paddingTop: space.xxl, borderTopWidth: StyleSheet.hairlineWidth },
})
