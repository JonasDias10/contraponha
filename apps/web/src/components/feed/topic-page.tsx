"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Hash } from "lucide-react"
import { useRouter } from "next/navigation"
import { queryKeys, topicLabel, topicMeta } from "@contraponha/client-core"

import { FeedList } from "@/components/feed/feed-list"
import { Button, Card, EmptyState, useApi, useI18n, useViewer } from "@contraponha/web-ui"

export interface TopicPageProps {
  slug: string
}

export function TopicPage({ slug }: TopicPageProps): React.JSX.Element | null {
  const { t, locale } = useI18n()
  const api = useApi()
  const viewer = useViewer()
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: topic } = useQuery({
    queryKey: queryKeys.topics.one(slug),
    queryFn: () => api.topics.get(slug),
  })

  const follow = useMutation({
    mutationFn: (isFollowing: boolean) =>
      isFollowing ? api.topics.follow(slug) : api.topics.unfollow(slug),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.topics.one(slug) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.topics.followed }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.discover }),
      ]),
  })

  if (!topic) return null

  const isFollowing = follow.isPending ? follow.variables : (topic.viewer?.isFollowing ?? false)

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-brand-soft text-brand"
        >
          <Hash className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-serif text-[25px] font-semibold">{topicLabel(topic)}</h1>
          <p className="text-sm text-muted">{topicMeta({ topic, t, locale })}</p>
        </div>
        <Button
          variant={isFollowing ? "secondary" : "primary"}
          aria-pressed={isFollowing}
          onClick={() => (viewer ? follow.mutate(!isFollowing) : router.push("/login"))}
        >
          {isFollowing ? t("web.topic.following") : t("web.topic.follow")}
        </Button>
      </Card>
      <FeedList
        queryKey={queryKeys.feed.topic(slug)}
        load={(cursor) => api.feed.topic({ slug, query: { cursor } })}
        empty={<EmptyState icon={<Hash className="size-8" />} title={t("web.topic.empty")} />}
      />
    </div>
  )
}
