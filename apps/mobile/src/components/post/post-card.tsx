import { readingMinutes, topicLabel } from "@contraponha/client-core"
import { useReactions } from "@contraponha/client-core/react"
import type { FeedReason, PostView, PublicProfile } from "@contraponha/types"
import { router } from "expo-router"
import { History, Info, Pin, Repeat2 } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"

import { AuthorLine } from "@/components/post/author-line"
import { Markdown } from "@/components/post/markdown"
import { LinkPreviewCard } from "@/components/post/link-preview-card"
import { MediaGrid } from "@/components/post/media-grid"
import { QuotedPostCard } from "@/components/post/quoted-post-card"
import { PostActions } from "@/components/post/post-actions"
import { PostMenu } from "@/components/post/post-menu"
import { ReactionSummary } from "@/components/post/reaction-bar"
import { RemovedNotice } from "@/components/post/removed-notice"
import { SourceCard } from "@/components/post/source-card"
import { HighlightedText } from "@/components/search/highlighted-text"
import { Card } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { paths } from "@/lib/paths"
import { space } from "@/lib/theme"

const EXCERPT_LENGTH = 320
const CARD_LINES = 8

export interface PostCardProps {
  post: PostView
  reason?: FeedReason | null
  repostedBy?: PublicProfile | null
  highlight?: string | null
}

interface MetaLineProps {
  icon: React.ReactNode
  text: string
}

function MetaLine({ icon, text }: MetaLineProps): React.JSX.Element {
  return (
    <View style={styles.metaLine}>
      {icon}
      <AppText variant="caption" tone="subtle">
        {text}
      </AppText>
    </View>
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
  const palette = usePalette()

  const reactions = useReactions({
    targetType: "post",
    targetId: post.id,
    postId: post.id,
    initialReactions: post.viewer?.reactions ?? [],
    initialCounts: post.reactionCounts,
  })

  if (post.isDeleted) {
    return (
      <Card>
        <RemovedNotice removedBy={post.removedBy} rule={post.removalRule} subject="post" />
      </Card>
    )
  }

  const body = post.body ?? ""
  const isTruncated = body.length > EXCERPT_LENGTH
  const [firstSource] = post.sources
  const open = (): void => router.push(paths.post(post.id))

  return (
    <Card style={styles.card}>
      {repostedBy ? (
        <MetaLine
          icon={<Repeat2 size={14} color={palette.subtle} />}
          text={t("web.repost.repostedBy", { name: repostedBy.displayName })}
        />
      ) : null}
      {reason ? (
        <MetaLine
          icon={<Info size={14} color={palette.subtle} />}
          text={
            reason.topic
              ? t("web.feed.whyFollowedTopic", { topic: topicLabel(reason.topic) })
              : t("web.feed.whyFeatured")
          }
        />
      ) : null}
      {post.isPinned ? (
        <MetaLine icon={<Pin size={14} color={palette.subtle} />} text={t("web.post.pinned")} />
      ) : null}
      <AuthorLine
        author={post.author}
        createdAt={post.createdAt}
        extra={
          post.editedAt ? (
            <View style={styles.edited}>
              <AppText variant="caption" tone="subtle">
                {" · "}
              </AppText>
              <History size={12} color={palette.subtle} />
              <AppText variant="caption" tone="subtle" style={styles.dotted}>
                {t("web.post.edited")}
              </AppText>
            </View>
          ) : undefined
        }
        trailing={<PostMenu post={post} />}
      />
      <Pressable accessibilityRole="link" onPress={open} style={styles.body}>
        {post.title ? <AppText variant="postTitle">{post.title}</AppText> : null}
        {highlight ? (
          <AppText variant="reading" numberOfLines={CARD_LINES}>
            <HighlightedText text={highlight} />
          </AppText>
        ) : (
          <Markdown text={body} numberOfLines={CARD_LINES} isLinkDisabled />
        )}
        {isTruncated ? (
          <AppText variant="smallStrong" tone="brand">
            {t("web.post.readMore", { minutes: readingMinutes(body) })}
          </AppText>
        ) : null}
      </Pressable>
      <MediaGrid media={post.media} />
      {post.quotedPost ? <QuotedPostCard quoted={post.quotedPost} /> : null}
      {post.linkPreview ? <LinkPreviewCard preview={post.linkPreview} /> : null}
      {firstSource && firstSource.url !== post.linkPreview?.url ? (
        <SourceCard source={firstSource} />
      ) : null}
      <ReactionSummary counts={reactions.counts} commentCount={post.commentCount} />
      <PostActions post={post} reactions={reactions} />
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: 14, padding: space.xl },
  metaLine: { flexDirection: "row", alignItems: "center", gap: 6 },
  edited: { flexDirection: "row", alignItems: "center", gap: 3 },
  dotted: { textDecorationLine: "underline", textDecorationStyle: "dotted" },
  body: { gap: space.sm },
})
