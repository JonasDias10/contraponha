"use client"

import { queryKeys } from "@contraponha/client-core"
import { useRelationMutation, type RelationKind } from "@contraponha/client-core/react"
import type { MessageKey } from "@contraponha/i18n"
import { Avatar, Button, useApi, useI18n } from "@contraponha/web-ui"
import { useInfiniteQuery } from "@tanstack/react-query"
import Link from "next/link"

import { SettingsSection } from "@/components/settings/settings-section"
import { paths } from "@/lib/paths"

const FIRST_PAGE: string | undefined = undefined

export function RelationsSettings(): React.JSX.Element {
  const { t } = useI18n()

  return (
    <SettingsSection
      title={t("web.relations.settingsTitle")}
      lead={t("web.relations.settingsLead")}
    >
      <RelationList
        kind="block"
        title="web.relations.blockedTitle"
        empty="web.relations.noBlocked"
        undo="web.relations.undoBlock"
      />
      <RelationList
        kind="mute"
        title="web.relations.mutedTitle"
        empty="web.relations.noMuted"
        undo="web.relations.undoMute"
      />
    </SettingsSection>
  )
}

interface RelationListProps {
  kind: RelationKind
  title: MessageKey
  empty: MessageKey
  undo: MessageKey
}

function RelationList({ kind, title, empty, undo }: RelationListProps): React.JSX.Element {
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

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[15px] font-semibold">{t(title)}</h3>
      {people.length === 0 && !query.isPending ? (
        <p className="text-sm text-muted">{t(empty)}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 py-3">
              <Avatar id={person.id} name={person.displayName} src={person.avatarUrl} size="sm" />
              <Link
                href={paths.profile(person.handle)}
                className="flex min-w-0 flex-1 flex-col text-ink no-underline"
              >
                <span className="truncate font-semibold">{person.displayName}</span>
                <span className="truncate text-sm text-muted">@{person.handle}</span>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                disabled={relation.isPending}
                onClick={() => relation.mutate({ handle: person.handle, kind, isOn: false })}
              >
                {t(undo)}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {query.hasNextPage ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          isLoading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {t("web.common.loadMore")}
        </Button>
      ) : null}
    </section>
  )
}
