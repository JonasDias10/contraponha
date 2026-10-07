"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import { queryKeys, topicLabel } from "@contraponha/client-core"

import { FollowButton } from "@/components/profile/follow-button"
import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { useViewer } from "@/components/providers/viewer-provider"
import { Avatar } from "@/components/ui/avatar"
import { tagVariants } from "@/components/ui/badges"
import { Card } from "@/components/ui/surfaces"
import { paths } from "@/lib/paths"

export interface ProfileRailProps {
  handle: string
}

export function ProfileRail({ handle }: ProfileRailProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const viewer = useViewer()

  const profile = useQuery({
    queryKey: queryKeys.profile(handle),
    queryFn: () => api.users.getByHandle(handle),
  })

  const suggestions = useQuery({
    queryKey: queryKeys.suggestions,
    queryFn: () => api.users.suggestions(),
    enabled: viewer !== null,
  })

  const topics = profile.data?.topics ?? []

  const people = (suggestions.data?.people ?? [])
    .filter(({ profile: person }) => person.handle !== handle)
    .slice(0, 3)

  return (
    <>
      {topics.length > 0 ? (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="text-xs font-semibold tracking-[0.08em] text-muted uppercase">
            {t("web.profile.writesAbout")}
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
      {people.length > 0 ? (
        <Card className="flex flex-col py-3">
          <h2 className="px-4 py-2 text-xs font-semibold tracking-[0.08em] text-muted uppercase">
            {t("web.profile.similarPeople")}
          </h2>
          {people.map(({ profile: person }) => (
            <div
              key={person.id}
              className="flex items-start gap-3 border-t border-line px-4 py-3 first-of-type:border-t-0"
            >
              <Avatar id={person.id} name={person.displayName} size="sm" />
              <Link
                href={paths.profile(person.handle)}
                className="flex min-w-0 flex-1 flex-col text-ink no-underline"
              >
                <span className="truncate text-sm font-semibold">{person.displayName}</span>
                <span className="truncate text-[13px] text-subtle">
                  {person.headline ?? `@${person.handle}`}
                </span>
              </Link>
              <FollowButton handle={person.handle} initialIsFollowing={false} size="sm" />
            </div>
          ))}
        </Card>
      ) : null}
    </>
  )
}
