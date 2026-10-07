import type { ContributionView } from "@contraponha/types"
import { router } from "expo-router"
import { Star } from "lucide-react-native"
import { Pressable, StyleSheet, View } from "react-native"

import { AuthorLine } from "@/components/post/author-line"
import { Markdown } from "@/components/post/markdown"
import { ReactionSummary } from "@/components/post/reaction-bar"
import { HighlightedText } from "@/components/search/highlighted-text"
import { Card } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { paths } from "@/lib/paths"
import { space } from "@/lib/theme"

export interface ContributionCardProps {
  contribution: ContributionView
  highlight?: string | null
}

// A contribution shown outside its discussion, with the post it answers.
export function ContributionCard({
  contribution,
  highlight,
}: ContributionCardProps): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const { comment, post } = contribution

  const where = post.title
    ? t("web.comment.inPost", { title: post.title })
    : t("web.comment.inUntitledPost", {
        author: post.author?.displayName ?? t("web.common.deletedAccount"),
      })

  return (
    <Card style={styles.card}>
      <AuthorLine author={comment.author} createdAt={comment.createdAt} size="sm" />
      <AppText variant="caption" tone="subtle" numberOfLines={1}>
        {where}
      </AppText>
      {comment.highlight ? (
        <View style={styles.row}>
          <Star size={16} color={palette.accent} />
          <AppText variant="caption" tone="accent" style={styles.bold}>
            {t("web.comment.highlightedBy")}
            {comment.highlight.note ? ` · ${comment.highlight.note}` : ""}
          </AppText>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="link"
        onPress={() =>
          router.push(paths.comment({ postId: comment.postId, commentId: comment.id }))
        }
      >
        {highlight ? (
          <AppText variant="reading" numberOfLines={6}>
            <HighlightedText text={highlight} />
          </AppText>
        ) : (
          <Markdown text={comment.body ?? ""} numberOfLines={6} fontSize={16} isLinkDisabled />
        )}
      </Pressable>
      <ReactionSummary counts={comment.reactionCounts} />
    </Card>
  )
}

const styles = StyleSheet.create({
  card: { gap: space.md, padding: space.xl },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  bold: { fontWeight: "600" },
})
