import { formatDateTime, queryKeys } from "@contraponha/client-core"
import type { ModerationActionView } from "@contraponha/types"
import { StyleSheet, View } from "react-native"

import { InfiniteList } from "@/components/feed/infinite-list"
import { Screen, ScreenHeader } from "@/components/ui/screen"
import { EmptyState } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextLink } from "@/components/ui/text-link"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { paths } from "@/lib/paths"
import { space } from "@/lib/theme"

interface ActionRowProps {
  action: ModerationActionView
}

function ActionRow({ action }: ActionRowProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const palette = usePalette()

  return (
    <View style={[styles.row, { borderBottomColor: palette.line }]}>
      <AppText variant="bodyStrong">{t(`web.moderation.action_${action.type}`)}</AppText>
      <AppText variant="small" tone="muted">
        {action.moderator?.displayName ?? t("web.moderation.systemActor")} ·{" "}
        {formatDateTime({ value: action.createdAt, locale })}
        {action.rule ? ` · ${t(`web.rules.${action.rule}`)}` : ""}
      </AppText>
      {action.note ? <AppText variant="small">{action.note}</AppText> : null}
      {action.postId ? (
        <TextLink variant="small" href={paths.post(action.postId)}>
          {t("web.moderation.openTarget")}
        </TextLink>
      ) : null}
    </View>
  )
}

export default function ModerationActionsScreen(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  return (
    <Screen>
      <ScreenHeader title={t("web.moderation.actions")} />
      <InfiniteList<ModerationActionView>
        queryKey={queryKeys.moderationActions}
        load={(cursor) => api.moderation.listActions({ cursor })}
        renderItem={({ item }) => <ActionRow action={item} />}
        keyOf={(item) => item.id}
        empty={<EmptyState title={t("web.moderation.emptyTitle")} />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  row: { gap: space.xs, paddingVertical: space.lg, borderBottomWidth: StyleSheet.hairlineWidth },
})
