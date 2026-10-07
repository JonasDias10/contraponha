import type { CommunityRule, ContentRemoval } from "@contraponha/types"
import { ShieldAlert } from "lucide-react-native"
import { StyleSheet, View } from "react-native"

import { openLegalPage } from "@/components/auth/legal-links"
import { AppText } from "@/components/ui/text"
import { TextLink } from "@/components/ui/text-link"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { radius, space } from "@/lib/theme"

export interface RemovedNoticeProps {
  removedBy: ContentRemoval | null
  rule: CommunityRule | null
  subject: "post" | "comment"
}

// Moderation decisions always name the rule that was applied.
export function RemovedNotice({ removedBy, rule, subject }: RemovedNoticeProps): React.JSX.Element {
  const palette = usePalette()
  const { t } = useI18n()

  if (removedBy !== "moderation") {
    return (
      <AppText variant="small" tone="subtle" style={styles.italic}>
        {subject === "post" ? t("web.post.removedByAuthor") : t("web.comment.removedByAuthor")}
      </AppText>
    )
  }

  return (
    <View style={[styles.box, { backgroundColor: palette.surfaceSunken }]}>
      <View style={styles.row}>
        <ShieldAlert size={16} color={palette.muted} />
        <AppText variant="bodyStrong">
          {subject === "post"
            ? t("web.post.removedByModeration")
            : t("web.comment.removedByModeration")}
        </AppText>
      </View>
      {rule ? (
        <AppText variant="small" tone="muted">
          {t("web.post.removedRule", { rule: t(`web.rules.${rule}`) })}
        </AppText>
      ) : null}
      <TextLink variant="small" onPress={() => openLegalPage("guidelines")}>
        {t("web.post.understandRule")}
      </TextLink>
    </View>
  )
}

const styles = StyleSheet.create({
  italic: { fontStyle: "italic" },
  box: { gap: space.sm, padding: space.lg, borderRadius: radius.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.sm },
})
