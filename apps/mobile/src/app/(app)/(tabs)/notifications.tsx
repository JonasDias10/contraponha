import { periodOf, queryKeys, type NotificationPeriod } from "@contraponha/client-core"
import { NotificationFilter, type NotificationView } from "@contraponha/types"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BellOff, CalendarClock, CheckCheck } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, View } from "react-native"

import { NotificationItem } from "@/components/notifications/notification-item"
import { IconButton } from "@/components/ui/icon-button"
import { Screen } from "@/components/ui/screen"
import { Segmented } from "@/components/ui/segmented"
import { Banner, EmptyState } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { TextLink } from "@/components/ui/text-link"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { space } from "@/lib/theme"

const FIRST_PAGE: string | undefined = undefined
const PERIODS: NotificationPeriod[] = ["today", "thisWeek", "earlier"]

export default function NotificationsTab(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<NotificationFilter>(NotificationFilter.ALL)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const query = useInfiniteQuery({
    queryKey: queryKeys.notifications(filter),
    queryFn: ({ pageParam }) => api.notifications.list({ filter, cursor: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const preferences = useQuery({
    queryKey: queryKeys.notificationPreferences,
    queryFn: () => api.notifications.getPreferences(),
  })

  const markAll = useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.notificationsAll }),
  })

  const items = query.data?.pages.flatMap((page) => page.items) ?? []
  const now = new Date()
  const hasUnread = items.some(({ isRead }) => !isRead)
  const digestHours = preferences.data?.digestHours ?? []

  const sections = PERIODS.map((period) => ({
    period,
    data: items.filter(({ createdAt }) => periodOf({ createdAt, now }) === period),
  })).filter(({ data }) => data.length > 0)

  const refresh = async (): Promise<void> => {
    setIsRefreshing(true)

    await query.refetch()

    setIsRefreshing(false)
  }

  return (
    <Screen>
      <SectionList<NotificationView, { period: NotificationPeriod; data: NotificationView[] }>
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem notification={item} />}
        renderSectionHeader={({ section }) => (
          <AppText
            variant="overline"
            tone="muted"
            style={[styles.section, { backgroundColor: palette.surface }]}
          >
            {t(`web.notifications.${section.period}`)}
          </AppText>
        )}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AppText variant="heading1" accessibilityRole="header">
                {t("web.notifications.title")}
              </AppText>
              {hasUnread ? (
                <IconButton
                  icon={CheckCheck}
                  label={t("web.notifications.markAllRead")}
                  color={palette.ink}
                  onPress={() => markAll.mutate()}
                />
              ) : null}
            </View>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: NotificationFilter.ALL, label: t("web.notifications.all") },
                { value: NotificationFilter.MENTIONS, label: t("web.notifications.mentions") },
                { value: NotificationFilter.MODERATION, label: t("web.notifications.moderation") },
              ]}
            />
            {digestHours.length > 0 ? (
              <Banner icon={<CalendarClock size={20} color={palette.ink} />}>
                <View style={styles.digest}>
                  <AppText variant="small">
                    {t("web.notifications.digestBanner", {
                      hours: digestHours.map((hour) => `${hour}h`).join(", "),
                    })}
                  </AppText>
                  <TextLink variant="small" href="/settings/notifications">
                    {t("web.notifications.changeHours")}
                  </TextLink>
                </View>
              </Banner>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator style={styles.loading} color={palette.muted} />
          ) : (
            <EmptyState
              icon={<BellOff size={32} color={palette.muted} />}
              title={t("web.notifications.emptyTitle")}
              description={t("web.notifications.emptyBody")}
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator style={styles.loading} color={palette.muted} />
          ) : items.length > 0 && !query.hasNextPage ? (
            <AppText variant="caption" tone="subtle" style={styles.end}>
              {t("web.notifications.end")}
            </AppText>
          ) : null
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage()
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            tintColor={palette.muted}
          />
        }
        contentContainerStyle={styles.content}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  header: { gap: space.md, padding: space.gutter, paddingBottom: space.sm },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  digest: { gap: space.xs },
  section: { paddingHorizontal: space.gutter, paddingTop: space.lg, paddingBottom: space.sm },
  loading: { paddingVertical: space.xxl },
  end: { textAlign: "center", paddingVertical: space.lg },
})
