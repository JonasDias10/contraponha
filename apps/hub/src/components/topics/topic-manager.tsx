"use client"

import { errorMessage, formatCount } from "@contraponha/client-core"
import { ApiError } from "@contraponha/api-client"
import type { AdminTopic } from "@contraponha/types"
import {
  createTopicInputSchema,
  type AdminTopicListQuery,
  type UpdateTopicInput,
} from "@contraponha/validation"
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Segmented,
  SegmentedItem,
  SegmentedList,
  Switch,
  useApi,
  useI18n,
} from "@contraponha/web-ui"
import { useDebouncedValue } from "@contraponha/client-core/react"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Hash, Search } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { hubQueryKeys } from "@/lib/query-keys"

const FIRST_PAGE: string | undefined = undefined
const SEARCH_DELAY_MS = 300

const FILTERS = ["all", "true", "false"] as const

type CuratedFilter = (typeof FILTERS)[number]

function filterOf(value: string): CuratedFilter | undefined {
  return FILTERS.find((filter) => filter === value)
}

export function TopicManager(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const [search, setSearch] = useState("")
  const [curated, setCurated] = useState<CuratedFilter>("all")
  const q = useDebouncedValue({ value: search.trim(), delayMs: SEARCH_DELAY_MS })

  const filters: AdminTopicListQuery = {
    q: q || undefined,
    curated: curated === "all" ? undefined : curated,
  }

  const query = useInfiniteQuery({
    queryKey: hubQueryKeys.topics(filters),
    queryFn: ({ pageParam }) => api.admin.listTopics({ ...filters, cursor: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  })

  const topics = query.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[28px] font-semibold">{t("hub.topics.title")}</h1>
        <p className="text-muted">{t("hub.topics.lead")}</p>
      </div>
      <CreateTopicForm />
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">{t("hub.topics.search")}</span>
          <Search
            aria-hidden
            className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-subtle"
          />
          <Input
            type="search"
            value={search}
            placeholder={t("hub.topics.search")}
            className="pl-10"
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <Segmented
          value={curated}
          onValueChange={(value) => {
            const next = filterOf(value)

            if (next) setCurated(next)
          }}
        >
          <SegmentedList>
            <SegmentedItem value="all">{t("hub.topics.all")}</SegmentedItem>
            <SegmentedItem value="true">{t("hub.topics.curated")}</SegmentedItem>
            <SegmentedItem value="false">{t("hub.topics.others")}</SegmentedItem>
          </SegmentedList>
        </Segmented>
      </div>
      {topics.length === 0 && !query.isPending ? (
        <Card>
          <EmptyState icon={<Hash className="size-8" />} title={t("hub.topics.empty")} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {topics.map((topic) => (
              <TopicRow key={topic.id} topic={topic} />
            ))}
          </ul>
        </Card>
      )}
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
    </>
  )
}

function CreateTopicForm(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const parsed = createTopicInputSchema.safeParse({ name, slug, isCurated: true })

  const create = useMutation({
    mutationFn: () => api.admin.createTopic({ name: name.trim(), slug, isCurated: true }),
    onSuccess: async () => {
      setName("")

      setSlug("")

      toast.success(t("hub.topics.created"))

      await queryClient.invalidateQueries({ queryKey: hubQueryKeys.allTopics })
    },
    onError: (error) =>
      toast.error(
        error instanceof ApiError && error.code === "CONFLICT"
          ? t("hub.topics.slugTaken")
          : errorMessage({ error, t }),
      ),
  })

  return (
    <Card className="p-5">
      <form
        className="flex flex-col gap-4 md:flex-row md:items-start"
        onSubmit={(event) => {
          event.preventDefault()

          if (parsed.success) create.mutate()
        }}
      >
        <Field label={t("hub.topics.name")} className="flex-1">
          {({ id }) => (
            <Input
              id={id}
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>
        <Field label={t("hub.topics.slug")} hint={t("hub.topics.slugHint")} className="flex-1">
          {({ id, describedBy }) => (
            <Input
              id={id}
              value={slug}
              maxLength={60}
              aria-describedby={describedBy}
              onChange={(event) => setSlug(event.target.value.toLowerCase())}
            />
          )}
        </Field>
        <Button
          type="submit"
          disabled={!parsed.success}
          isLoading={create.isPending}
          className="md:mt-6.5"
        >
          {t("hub.topics.create")}
        </Button>
      </form>
    </Card>
  )
}

interface TopicRowProps {
  topic: AdminTopic
}

function TopicRow({ topic }: TopicRowProps): React.JSX.Element {
  const { t, locale } = useI18n()
  const api = useApi()
  const queryClient = useQueryClient()
  const [isRenaming, setIsRenaming] = useState(false)
  const [name, setName] = useState(topic.name)

  const update = useMutation({
    mutationFn: (input: UpdateTopicInput) => api.admin.updateTopic({ slug: topic.slug, input }),
    onSuccess: async () => {
      setIsRenaming(false)

      toast.success(t("hub.topics.saved"))

      await queryClient.invalidateQueries({ queryKey: hubQueryKeys.allTopics })
    },
    onError: (error) => toast.error(errorMessage({ error, t })),
  })

  return (
    <li className="flex flex-wrap items-center gap-4 border-t border-line px-5 py-3.5 first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {isRenaming ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()

              update.mutate({ name: name.trim() })
            }}
          >
            <Input
              aria-label={t("hub.topics.name")}
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
            />
            <Button type="submit" size="sm" isLoading={update.isPending}>
              {t("hub.topics.save")}
            </Button>
          </form>
        ) : (
          <span className="font-semibold">{topic.name}</span>
        )}
        <span className="text-sm text-muted">
          #{topic.slug} ·{" "}
          {t("hub.topics.stats", {
            posts: formatCount({ value: topic.postCount, locale }),
            followers: formatCount({ value: topic.followerCount, locale }),
          })}
        </span>
      </div>
      {isRenaming ? null : (
        <Button variant="ghost" size="sm" onClick={() => setIsRenaming(true)}>
          {t("hub.topics.rename")}
        </Button>
      )}
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={topic.isCurated}
          disabled={update.isPending}
          onCheckedChange={(isCurated) => update.mutate({ isCurated })}
        />
        {t("hub.topics.isCurated")}
      </label>
    </li>
  )
}
