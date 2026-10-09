"use client"

import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Hash, Search, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import {
  queryKeys,
  SEARCH_TABS,
  toContentSearchQuery,
  topicLabel,
  topicMeta,
} from "@contraponha/client-core"

import { ContributionCard } from "@/components/discussion/contribution-card"
import { PostCardSkeleton } from "@/components/feed/feed-list"
import { PostCard } from "@/components/post/post-card"
import { Avatar, Button, Card, cn, EmptyState, useApi, useI18n } from "@contraponha/web-ui"
import { useSearchState, type SearchState } from "@/components/search/use-search-params-state"
import { paths } from "@/lib/paths"

const FIRST_PAGE: string | undefined = undefined
const PREVIEW_PEOPLE = 3

export function SearchResults(): React.JSX.Element {
  const { t } = useI18n()
  const { state, update } = useSearchState()

  return (
    <div className="flex flex-col gap-5">
      <SearchForm
        key={state.q}
        initialQuery={state.q}
        onSearch={(q) => update({ q: q || undefined })}
      />
      <nav
        aria-label={t("web.nav.search")}
        className="flex gap-6 overflow-x-auto border-b border-line"
      >
        {SEARCH_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            aria-current={state.tab === tab ? "page" : undefined}
            onClick={() => update({ tab: tab === "all" ? undefined : tab })}
            className={cn(
              "-mb-px border-b-2 py-3 text-[15px] font-medium whitespace-nowrap",
              state.tab === tab
                ? "border-ink font-semibold text-ink"
                : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t(`web.search.${tab}`)}
          </button>
        ))}
      </nav>
      {state.isSearchable ? (
        <ResultsForTab state={state} />
      ) : (
        <EmptyState
          icon={<Search className="size-8" />}
          title={t("web.search.startTitle")}
          description={state.q ? t("web.search.minLength") : t("web.search.startBody")}
        />
      )}
    </div>
  )
}

interface SearchFormProps {
  initialQuery: string
  onSearch: (query: string) => void
}

function SearchForm({ initialQuery, onSearch }: SearchFormProps): React.JSX.Element {
  const { t } = useI18n()
  const [draft, setDraft] = useState(initialQuery)

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()

        onSearch(draft.trim())
      }}
    >
      <label className="flex h-13 items-center gap-2 rounded-full border border-transparent bg-surface-sunken px-4 text-[17px] focus-within:border-brand">
        <Search aria-hidden className="size-5 text-subtle" />
        <span className="sr-only">{t("web.nav.search")}</span>
        <input
          type="search"
          autoFocus={!initialQuery}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("web.search.placeholder")}
          className="min-w-0 flex-1 bg-transparent placeholder:text-subtle focus-visible:outline-none"
        />
        {draft ? (
          <button
            type="button"
            aria-label={t("web.search.clear")}
            onClick={() => {
              setDraft("")

              onSearch("")
            }}
            className="grid size-9 place-items-center rounded-md text-muted"
          >
            <X aria-hidden className="size-4" />
          </button>
        ) : null}
      </label>
    </form>
  )
}

interface ResultsProps {
  state: SearchState
}

function ResultsForTab({ state }: ResultsProps): React.JSX.Element {
  switch (state.tab) {
    case "posts":
      return <PostResults state={state} />
    case "contributions":
      return <ContributionResults state={state} />
    case "people":
      return <PeopleResults state={state} />
    case "topics":
      return <TopicResults state={state} />
    case "all":
      return (
        <div className="flex flex-col gap-6">
          <TopicResults state={state} limit={1} />
          <PeopleResults state={state} limit={PREVIEW_PEOPLE} />
          <PostResults state={state} />
        </div>
      )
  }
}

function NoResults(): React.JSX.Element {
  const { t } = useI18n()

  return (
    <EmptyState
      icon={<Search className="size-8" />}
      title={t("web.search.emptyTitle")}
      description={t("web.search.emptyBody")}
    />
  )
}

function PostResults({ state }: ResultsProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  const query = useInfiniteQuery({
    queryKey: queryKeys.search.posts(state),
    queryFn: ({ pageParam }) =>
      api.search.posts(toContentSearchQuery({ key: state, cursor: pageParam })),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  if (query.isPending) return <PostCardSkeleton />

  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  if (items.length === 0) return state.tab === "all" ? <></> : <NoResults />

  return (
    <section className="flex flex-col gap-3">
      {state.tab === "all" ? (
        <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
          {t("web.search.posts")}
        </h2>
      ) : null}
      {items.map(({ post, highlight }) => (
        <PostCard key={post.id} post={post} highlight={highlight} />
      ))}
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          className="self-center"
          isLoading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("web.common.loadMore")}
        </Button>
      ) : null}
    </section>
  )
}

function ContributionResults({ state }: ResultsProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  const query = useInfiniteQuery({
    queryKey: queryKeys.search.contributions(state),
    queryFn: ({ pageParam }) =>
      api.search.contributions(toContentSearchQuery({ key: state, cursor: pageParam })),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  if (query.isPending) return <PostCardSkeleton />

  const items = query.data?.pages.flatMap((page) => page.items) ?? []

  if (items.length === 0) return <NoResults />

  return (
    <section className="flex flex-col gap-3">
      {items.map(({ contribution, highlight }) => (
        <ContributionCard
          key={contribution.comment.id}
          contribution={contribution}
          highlight={highlight}
        />
      ))}
      {query.hasNextPage ? (
        <Button
          variant="secondary"
          className="self-center"
          isLoading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("web.common.loadMore")}
        </Button>
      ) : null}
    </section>
  )
}

interface LimitedResultsProps extends ResultsProps {
  limit?: number
}

function PeopleResults({ state, limit }: LimitedResultsProps): React.JSX.Element | null {
  const { t } = useI18n()
  const api = useApi()

  const query = useQuery({
    queryKey: queryKeys.search.users(state.q),
    queryFn: () => api.search.users({ q: state.q }),
  })

  const people = (query.data?.items ?? []).slice(0, limit)

  if (query.isPending) return null

  if (people.length === 0) return limit ? null : <NoResults />

  return (
    <section className="flex flex-col gap-2">
      {limit ? (
        <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
          {t("web.search.people")}
        </h2>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        {people.map((person) => (
          <Link key={person.id} href={paths.profile(person.handle)} className="no-underline">
            <Card className="flex h-full flex-col gap-2 p-4 text-ink hover:border-line-strong">
              <Avatar id={person.id} name={person.displayName} src={person.avatarUrl} />
              <span className="font-semibold">{person.displayName}</span>
              <span className="text-[13px] text-subtle">
                {person.headline ?? `@${person.handle}`}
              </span>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}

function TopicResults({ state, limit }: LimitedResultsProps): React.JSX.Element | null {
  const { t, locale } = useI18n()
  const api = useApi()

  const query = useQuery({
    queryKey: queryKeys.search.topics(state.q),
    queryFn: () => api.search.topics({ q: state.q }),
  })

  const topics = (query.data?.topics ?? []).slice(0, limit)

  if (query.isPending) return null

  if (topics.length === 0) return limit ? null : <NoResults />

  return (
    <section className="flex flex-col gap-3">
      {topics.map((topic) => (
        <Card key={topic.slug} className="flex items-center gap-4 p-5">
          <span
            aria-hidden
            className="grid size-14 flex-none place-items-center rounded-full bg-brand-soft text-brand"
          >
            <Hash className="size-6" />
          </span>
          <Link
            href={paths.topic(topic.slug)}
            className="flex min-w-0 flex-1 flex-col gap-1 text-ink no-underline"
          >
            <span className="text-lg font-semibold">{topicLabel(topic)}</span>
            <span className="text-sm text-muted">{topicMeta({ topic, t, locale })}</span>
          </Link>
        </Card>
      ))}
    </section>
  )
}
