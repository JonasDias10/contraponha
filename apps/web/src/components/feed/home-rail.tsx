"use client"

import { useQuery } from "@tanstack/react-query"
import { Info } from "lucide-react"
import Link from "next/link"
import { queryKeys, topicLabel } from "@contraponha/client-core"

import { SearchBox } from "@/components/search/search-box"
import { Card, Panel, tagVariants, useApi, useI18n, useViewer } from "@contraponha/web-ui"
import { paths } from "@/lib/paths"

export function HomeRail(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()

  const discussions = useQuery({
    queryKey: queryKeys.feed.discussions,
    queryFn: () => api.feed.discussions(),
  })

  const followedTopics = useQuery({
    queryKey: queryKeys.topics.followed,
    queryFn: () => api.topics.listFollowed(),
    enabled: viewer !== null,
  })

  const topics = followedTopics.data?.topics ?? []

  return (
    <>
      <SearchBox />
      {discussions.data && discussions.data.discussions.length > 0 ? (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
            {t("web.feed.ongoingTitle")}
          </h2>
          {discussions.data.discussions.map((discussion, index) => (
            <div key={discussion.postId} className="flex flex-col gap-3">
              {index > 0 ? <hr className="h-px border-0 bg-line" /> : null}
              <Link
                href={paths.post(discussion.postId)}
                className="flex flex-col gap-1 text-ink no-underline hover:underline"
              >
                <span className="font-semibold">{discussion.title}</span>
                <span className="text-[13px] text-subtle">
                  {t("web.post.summaryContributions", { count: discussion.commentCount })}
                  {" · "}
                  {t("web.feed.ongoingHighlighted", {
                    count: discussion.highlightedCommentCount,
                  })}
                </span>
              </Link>
            </div>
          ))}
        </Card>
      ) : null}
      {topics.length > 0 ? (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
            {t("web.feed.yourTopics")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <li key={topic.slug}>
                <Link href={paths.topic(topic.slug)} className={tagVariants()}>
                  {topicLabel(topic)}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <Panel className="flex flex-col gap-2 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Info aria-hidden className="size-5 text-muted" />
          {t("web.feed.howOrderedTitle")}
        </h2>
        <p className="text-sm text-muted">{t("web.feed.howOrderedBody")}</p>
        {viewer ? (
          <Link href="/settings/interests" className="text-sm font-semibold text-brand">
            {t("web.feed.adjust")}
          </Link>
        ) : null}
      </Panel>
      <p className="flex flex-wrap gap-3 text-[13px] text-subtle">
        <Link href="/guidelines" className="text-subtle">
          {t("web.footer.guidelines")}
        </Link>
        <Link href="/privacy" className="text-subtle">
          {t("web.footer.privacy")}
        </Link>
        <Link href="/transparency" className="text-subtle">
          {t("web.footer.transparency")}
        </Link>
      </p>
    </>
  )
}
