"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { errorMessage, queryKeys } from "@contraponha/client-core"

import { useApi } from "@/components/providers/app-providers"
import { useI18n } from "@/components/providers/i18n-provider"
import { SettingsSection } from "@/components/settings/settings-section"
import { InterestsPicker } from "@/components/topics/interests-picker"

interface TopicFollowChange {
  slug: string
  isFollowing: boolean
}

export function InterestsSettings(): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const queryClient = useQueryClient()

  const curated = useQuery({
    queryKey: queryKeys.topics.curated,
    queryFn: () => api.topics.listCurated(),
  })

  const followed = useQuery({
    queryKey: queryKeys.topics.followed,
    queryFn: () => api.topics.listFollowed(),
  })

  const toggle = useMutation({
    mutationFn: ({ slug, isFollowing }: TopicFollowChange) =>
      isFollowing ? api.topics.follow(slug) : api.topics.unfollow(slug),
    onError: (error) => toast.error(errorMessage({ error, t })),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.topics.followed }),
        queryClient.invalidateQueries({ queryKey: queryKeys.feed.discover }),
      ]),
  })

  const selected = new Set(followed.data?.topics.map(({ slug }) => slug) ?? [])
  const hashtags = (followed.data?.topics ?? []).filter(({ isCurated }) => !isCurated)
  const onToggle = (slug: string): void => toggle.mutate({ slug, isFollowing: !selected.has(slug) })

  if (toggle.isPending) {
    const { slug, isFollowing } = toggle.variables

    if (isFollowing) selected.add(slug)
    else selected.delete(slug)
  }

  return (
    <SettingsSection
      title={t("web.settings.interestsTitle")}
      lead={t("web.settings.interestsLead")}
    >
      <InterestsPicker
        topics={curated.data?.topics ?? []}
        selected={selected}
        onToggle={onToggle}
      />
      {hashtags.length > 0 ? (
        <InterestsPicker topics={hashtags} selected={selected} onToggle={onToggle} />
      ) : null}
    </SettingsSection>
  )
}
