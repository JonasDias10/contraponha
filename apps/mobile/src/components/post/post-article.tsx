import { formatDateTime, readingMinutes } from "@contraponha/client-core"
import { useBookmarkMutation, useReactions } from "@contraponha/client-core/react"
import type { PostView } from "@contraponha/types"
import { router } from "expo-router"
import { Bookmark, History, Share2 } from "lucide-react-native"
import { Pressable, Share, StyleSheet, View } from "react-native"

import { AuthorLine } from "@/components/post/author-line"
import { Markdown } from "@/components/post/markdown"
import { MediaGrid } from "@/components/post/media-grid"
import { QuotedPostCard } from "@/components/post/quoted-post-card"
import { PostMenu } from "@/components/post/post-menu"
import { ReactionBar } from "@/components/post/reaction-bar"
import { RemovedNotice } from "@/components/post/removed-notice"
import { SourceCard } from "@/components/post/source-card"
import { TopicTags } from "@/components/post/topic-tags"
import { FollowButton } from "@/components/profile/follow-button"
import { IconButton } from "@/components/ui/icon-button"
import { Banner } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextLink } from "@/components/ui/text-link"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useViewer } from "@/providers/session-provider"
import { openExternalUrl } from "@/lib/open-url"
import { paths, shareUrls } from "@/lib/paths"
import { space } from "@/lib/theme"

export interface PostArticleProps {
  post: PostView
}

export function PostArticle({ post }: PostArticleProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const palette = usePalette()
  const viewer = useViewer()
  const bookmark = useBookmarkMutation()

  const reactions = useReactions({
    targetType: "post",
    targetId: post.id,
    postId: post.id,
    initialReactions: post.viewer?.reactions ?? [],
    initialCounts: post.reactionCounts,
  })

  const isBookmarked = bookmark.isPending
    ? bookmark.variables.isSaving
    : (post.viewer?.isBookmarked ?? false)

  if (post.isDeleted)
    return <RemovedNotice removedBy={post.removedBy} rule={post.removalRule} subject="post" />

  return (
    <View style={styles.article}>
      {post.contextNote ? (
        <Banner tone="warning">
          <View style={styles.context}>
            <AppText variant="smallStrong" tone="warning">
              {t("web.post.contextTitle")}
            </AppText>
            <AppText variant="small">{post.contextNote.body}</AppText>
            {post.contextNote.sources.map((source) => (
              <TextLink
                key={source.url}
                variant="small"
                onPress={() => openExternalUrl(source.url)}
              >
                {source.title ?? source.host}
              </TextLink>
            ))}
          </View>
        </Banner>
      ) : null}
      <AuthorLine
        author={post.author}
        createdAt={post.createdAt}
        size="lg"
        trailing={
          <View style={styles.trailing}>
            {post.author && viewer && viewer.id !== post.author.id ? (
              <FollowButton handle={post.author.handle} size="sm" />
            ) : null}
            <PostMenu post={post} afterDelete={() => router.replace("/home")} />
          </View>
        }
      />
      {post.title ? (
        <AppText variant="heading1" accessibilityRole="header">
          {post.title}
        </AppText>
      ) : null}
      <View style={styles.meta}>
        <AppText variant="small" tone="subtle">
          {formatDateTime({ value: post.createdAt, locale })} ·{" "}
          {t("web.post.readingTime", { minutes: readingMinutes(post.body ?? "") })}
        </AppText>
        {post.editedAt ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(paths.history(post.id))}
            style={styles.edited}
          >
            <History size={14} color={palette.brand} />
            <AppText variant="small" tone="brand" style={styles.dotted}>
              {t("web.post.editedAt", { time: formatDateTime({ value: post.editedAt, locale }) })}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <Markdown text={post.body ?? ""} fontSize={18} />
      <MediaGrid media={post.media} />
      {post.quotedPost ? <QuotedPostCard quoted={post.quotedPost} /> : null}
      {post.sources.length > 0 ? (
        <View style={styles.sources} accessibilityLabel={t("web.post.sourcesLabel")}>
          {post.sources.map((source) => (
            <SourceCard key={source.url} source={source} />
          ))}
        </View>
      ) : null}
      <TopicTags topics={post.topics} />
      {post.repostCount > 0 || post.quoteCount > 0 ? (
        <View style={styles.shares}>
          {post.repostCount > 0 ? (
            <AppText variant="small" tone="muted">
              {t("web.repost.reposts", { count: post.repostCount })}
            </AppText>
          ) : null}
          {post.quoteCount > 0 ? (
            <TextLink href={{ pathname: "/posts/[postId]/quotes", params: { postId: post.id } }}>
              {t("web.repost.quotes", { count: post.quoteCount })}
            </TextLink>
          ) : null}
        </View>
      ) : null}
      <ReactionBar
        reactions={reactions.reactions}
        counts={reactions.counts}
        onToggle={reactions.toggle}
      />
      <View style={styles.tools}>
        <IconButton
          icon={Bookmark}
          label={isBookmarked ? t("web.post.unsave") : t("web.post.save")}
          isActive={isBookmarked}
          onPress={() => bookmark.mutate({ postId: post.id, isSaving: !isBookmarked })}
        />
        <IconButton
          icon={Share2}
          label={t("web.post.share")}
          onPress={() => {
            const url = shareUrls.post(post.id)

            void Share.share({ message: post.title ? `${post.title}\n${url}` : url, url }).catch(
              () => undefined,
            )
          }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shares: { flexDirection: "row", flexWrap: "wrap", gap: space.lg },
  article: { gap: space.xl },
  context: { gap: space.xs },
  trailing: { flexDirection: "row", alignItems: "center", gap: space.xs },
  meta: { gap: space.xs },
  edited: { flexDirection: "row", alignItems: "center", gap: 4 },
  dotted: { textDecorationLine: "underline", textDecorationStyle: "dotted" },
  sources: { gap: space.sm },
  tools: { flexDirection: "row", justifyContent: "flex-end", marginTop: -space.md },
})
