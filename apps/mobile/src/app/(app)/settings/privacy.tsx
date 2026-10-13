import { queryKeys } from "@contraponha/client-core"
import { useRelationMutation, type RelationKind } from "@contraponha/client-core/react"
import type { MessageKey } from "@contraponha/i18n"
import { useInfiniteQuery } from "@tanstack/react-query"
import { router } from "expo-router"
import { Pressable, StyleSheet, View } from "react-native"

import { SettingsScreen } from "@/components/settings/settings-screen"
import { SettingsSection } from "@/components/settings/settings-section"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { AppText } from "@/components/ui/text"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { paths } from "@/lib/paths"
import { space } from "@/lib/theme"

const FIRST_PAGE: string | undefined = undefined

export default function PrivacySettingsScreen(): React.JSX.Element {
  const { t } = useI18n()

  return (
    <SettingsScreen title={t("web.relations.settingsTitle")}>
      <SettingsSection
        title={t("web.relations.blockedTitle")}
        lead={t("web.relations.settingsLead")}
      >
        <RelationList kind="block" empty="web.relations.noBlocked" undo="web.relations.undoBlock" />
      </SettingsSection>
      <SettingsSection title={t("web.relations.mutedTitle")}>
        <RelationList kind="mute" empty="web.relations.noMuted" undo="web.relations.undoMute" />
      </SettingsSection>
    </SettingsScreen>
  )
}

interface RelationListProps {
  kind: RelationKind
  empty: MessageKey
  undo: MessageKey
}

function RelationList({ kind, empty, undo }: RelationListProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const relation = useRelationMutation()

  const query = useInfiniteQuery({
    queryKey: kind === "block" ? queryKeys.relations.blocks : queryKeys.relations.mutes,
    queryFn: ({ pageParam }) =>
      kind === "block"
        ? api.relations.listBlocked({ cursor: pageParam })
        : api.relations.listMuted({ cursor: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const people = query.data?.pages.flatMap((page) => page.items) ?? []

  if (people.length === 0 && !query.isPending) {
    return (
      <AppText variant="small" tone="muted">
        {t(empty)}
      </AppText>
    )
  }

  return (
    <View style={styles.list}>
      {people.map((person) => (
        <View key={person.id} style={styles.row}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(paths.profile(person.handle))}
            style={styles.person}
          >
            <Avatar id={person.id} name={person.displayName} src={person.avatarUrl} size="sm" />
            <View style={styles.names}>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {person.displayName}
              </AppText>
              <AppText variant="small" tone="muted" numberOfLines={1}>
                @{person.handle}
              </AppText>
            </View>
          </Pressable>
          <Button
            size="sm"
            variant="secondary"
            label={t(undo)}
            disabled={relation.isPending}
            onPress={() => relation.mutate({ handle: person.handle, kind, isOn: false })}
          />
        </View>
      ))}
      {query.hasNextPage ? (
        <Button
          size="sm"
          variant="ghost"
          label={t("web.common.loadMore")}
          isLoading={query.isFetchingNextPage}
          onPress={() => void query.fetchNextPage()}
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  person: { flex: 1, flexDirection: "row", alignItems: "center", gap: space.md },
  names: { flex: 1 },
})
