import type { Page } from "@contraponha/types"
import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query"
import { WifiOff } from "lucide-react-native"
import { useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
  type ListRenderItem,
} from "react-native"

import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/surfaces"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { space } from "@/lib/theme"

const FIRST_PAGE: string | undefined = undefined

export interface InfiniteListProps<TItem> {
  queryKey: QueryKey
  load: (cursor: string | undefined) => Promise<Page<TItem>>
  renderItem: ListRenderItem<TItem>
  keyOf: (item: TItem) => string
  header?: React.ReactElement
  empty: React.ReactElement
  end?: React.ReactElement
  isSeparated?: boolean
  isEnabled?: boolean
}

// Every paginated list in the app: infinite scroll, pull to refresh, empty, error and end states.
export function InfiniteList<TItem>({
  queryKey,
  load,
  renderItem,
  keyOf,
  header,
  empty,
  end,
  isSeparated = false,
  isEnabled = true,
}: InfiniteListProps<TItem>): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => load(pageParam),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isEnabled,
  })

  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  const refresh = async (): Promise<void> => {
    setIsRefreshing(true)

    await query.refetch()

    setIsRefreshing(false)
  }

  const footer = query.isFetchingNextPage ? (
    <ActivityIndicator style={styles.footer} color={palette.muted} />
  ) : !query.hasNextPage && items.length > 0 ? (
    (end ?? null)
  ) : null

  const placeholder = query.isPending ? (
    <ActivityIndicator style={styles.footer} color={palette.muted} />
  ) : query.isError ? (
    <EmptyState
      icon={<WifiOff size={32} color={palette.danger} />}
      title={t("web.errors.errorTitle")}
      description={t("web.feed.loadError")}
      action={<Button label={t("web.common.retry")} onPress={() => void query.refetch()} />}
    />
  ) : (
    empty
  )

  return (
    <FlatList
      data={items}
      keyExtractor={keyOf}
      renderItem={renderItem}
      ListHeaderComponent={header}
      ListEmptyComponent={placeholder}
      ListFooterComponent={footer}
      ItemSeparatorComponent={isSeparated ? () => <View style={styles.gap} /> : undefined}
      contentContainerStyle={styles.content}
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
      keyboardShouldPersistTaps="handled"
    />
  )
}

const styles = StyleSheet.create({
  content: { padding: space.gutter, paddingBottom: 48, gap: space.lg },
  gap: { height: space.lg },
  footer: { paddingVertical: space.xxl },
})
