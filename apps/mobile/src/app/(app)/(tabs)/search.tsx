import {
  queryKeys,
  SEARCH_TABS,
  toContentSearchQuery,
  type SearchTab,
} from "@contraponha/client-core"
import { SEARCH_QUERY_MIN_LENGTH } from "@contraponha/config"
import {
  SearchPeriod,
  SearchSort,
  type ContributionSearchResult,
  type PostSearchResult,
} from "@contraponha/types"
import { useQuery } from "@tanstack/react-query"
import { Filter, Search, X } from "lucide-react-native"
import { useState } from "react"
import { FlatList, Pressable, StyleSheet, TextInput, View } from "react-native"

import { ContributionCard } from "@/components/discussion/contribution-card"
import { InfiniteList } from "@/components/feed/infinite-list"
import { PostCard } from "@/components/post/post-card"
import { PersonRow } from "@/components/profile/person-row"
import { SearchFiltersSheet, type SearchFilters } from "@/components/search/search-filters-sheet"
import { TopicRow } from "@/components/search/topic-row"
import { IconButton } from "@/components/ui/icon-button"
import { Screen } from "@/components/ui/screen"
import { ScrollTabs } from "@/components/ui/scroll-tabs"
import { EmptyState, LoadingView } from "@/components/ui/surfaces"
import { AppText } from "@/components/ui/text"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { fonts, radius, space } from "@/lib/theme"

const PREVIEW_PEOPLE = 3

const DEFAULT_FILTERS: SearchFilters = {
  sort: SearchSort.RELEVANT,
  period: SearchPeriod.ANY,
  hasSource: false,
  followingOnly: false,
  hasHighlights: false,
}

interface QueryProps {
  q: string
}

interface PreviewProps extends QueryProps {
  limit?: number
}

function PeoplePreview({ q, limit }: PreviewProps): React.JSX.Element | null {
  const { t } = useI18n()
  const api = useApi()

  const query = useQuery({
    queryKey: queryKeys.search.users(q),
    queryFn: () => api.search.users({ q }),
  })

  const people = (query.data?.items ?? []).slice(0, limit)

  if (people.length === 0) return null

  return (
    <View style={styles.preview}>
      <AppText variant="overline" tone="muted">
        {t("web.search.people")}
      </AppText>
      {people.map((person) => (
        <PersonRow key={person.id} person={person} isFollowing={undefined} />
      ))}
    </View>
  )
}

function TopicPreview({ q, limit }: PreviewProps): React.JSX.Element | null {
  const api = useApi()

  const query = useQuery({
    queryKey: queryKeys.search.topics(q),
    queryFn: () => api.search.topics({ q }),
  })

  const topics = (query.data?.topics ?? []).slice(0, limit)

  if (topics.length === 0) return null

  return (
    <View style={styles.preview}>
      {topics.map((topic) => (
        <TopicRow key={topic.slug} topic={topic} />
      ))}
    </View>
  )
}

function NoResults(): React.JSX.Element {
  const { t } = useI18n()
  const palette = usePalette()

  return (
    <EmptyState
      icon={<Search size={32} color={palette.muted} />}
      title={t("web.search.emptyTitle")}
      description={t("web.search.emptyBody")}
    />
  )
}

function PeopleResults({ q }: QueryProps): React.JSX.Element {
  const api = useApi()

  const query = useQuery({
    queryKey: queryKeys.search.users(q),
    queryFn: () => api.search.users({ q }),
  })

  if (query.isPending) return <LoadingView />

  return (
    <FlatList
      data={query.data?.items ?? []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PersonRow person={item} isFollowing={undefined} />}
      ListEmptyComponent={<NoResults />}
      contentContainerStyle={styles.list}
    />
  )
}

function TopicResults({ q }: QueryProps): React.JSX.Element {
  const api = useApi()

  const query = useQuery({
    queryKey: queryKeys.search.topics(q),
    queryFn: () => api.search.topics({ q }),
  })

  if (query.isPending) return <LoadingView />

  return (
    <FlatList
      data={query.data?.topics ?? []}
      keyExtractor={(item) => item.slug}
      renderItem={({ item }) => <TopicRow topic={item} />}
      ItemSeparatorComponent={() => <View style={styles.gap} />}
      ListEmptyComponent={<NoResults />}
      contentContainerStyle={styles.list}
    />
  )
}

export default function SearchTabScreen(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const [draft, setDraft] = useState("")
  const [q, setQ] = useState("")
  const [tab, setTab] = useState<SearchTab>("all")
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [isFiltering, setIsFiltering] = useState(false)
  const key = { q, ...filters }
  const isSearchable = q.length >= SEARCH_QUERY_MIN_LENGTH
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS)

  const results = !isSearchable ? (
    <EmptyState
      icon={<Search size={32} color={palette.muted} />}
      title={t("web.search.startTitle")}
      description={q ? t("web.search.minLength") : t("web.search.startBody")}
    />
  ) : tab === "people" ? (
    <PeopleResults q={q} />
  ) : tab === "topics" ? (
    <TopicResults q={q} />
  ) : tab === "contributions" ? (
    <InfiniteList<ContributionSearchResult>
      key={JSON.stringify(key)}
      queryKey={queryKeys.search.contributions(key)}
      load={(cursor) => api.search.contributions(toContentSearchQuery({ key, cursor }))}
      renderItem={({ item }) => (
        <ContributionCard contribution={item.contribution} highlight={item.highlight} />
      )}
      keyOf={(item) => item.contribution.comment.id}
      isSeparated
      empty={<NoResults />}
    />
  ) : (
    <InfiniteList<PostSearchResult>
      key={`${tab}-${JSON.stringify(key)}`}
      queryKey={queryKeys.search.posts(key)}
      load={(cursor) => api.search.posts(toContentSearchQuery({ key, cursor }))}
      renderItem={({ item }) => <PostCard post={item.post} highlight={item.highlight} />}
      keyOf={(item) => item.post.id}
      isSeparated
      header={
        tab === "all" ? (
          <View style={styles.previews}>
            <TopicPreview q={q} limit={1} />
            <PeoplePreview q={q} limit={PREVIEW_PEOPLE} />
            <AppText variant="overline" tone="muted">
              {t("web.search.posts")}
            </AppText>
          </View>
        ) : undefined
      }
      empty={<NoResults />}
    />
  )

  return (
    <Screen>
      <View style={styles.top}>
        <View style={[styles.field, { backgroundColor: palette.surfaceSunken }]}>
          <Search size={20} color={palette.subtle} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => setQ(draft.trim())}
            placeholder={t("web.search.placeholder")}
            placeholderTextColor={palette.subtle}
            selectionColor={palette.brand}
            returnKeyType="search"
            autoCorrect={false}
            aria-label={t("web.nav.search")}
            style={[styles.input, { color: palette.ink }]}
          />
          {draft ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("web.search.clear")}
              hitSlop={8}
              onPress={() => {
                setDraft("")

                setQ("")
              }}
            >
              <X size={18} color={palette.muted} />
            </Pressable>
          ) : null}
        </View>
        <IconButton
          icon={Filter}
          label={t("web.search.filters")}
          isActive={hasFilters}
          onPress={() => setIsFiltering(true)}
        />
      </View>
      <ScrollTabs
        value={tab}
        onChange={setTab}
        options={SEARCH_TABS.map((value) => ({ value, label: t(`web.search.${value}`) }))}
      />
      <View style={styles.fill}>{results}</View>
      <SearchFiltersSheet
        isOpen={isFiltering}
        filters={filters}
        onChange={setFilters}
        onClose={() => setIsFiltering(false)}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    padding: space.gutter,
    paddingBottom: space.sm,
  },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
  },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 17 },
  fill: { flex: 1 },
  list: { padding: space.gutter, paddingBottom: 48 },
  gap: { height: space.md },
  previews: { gap: space.lg, marginBottom: space.lg },
  preview: { gap: space.sm },
})
