import { queryKeys } from "@contraponha/client-core"
import type { PublicProfile } from "@contraponha/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"
import { Users } from "lucide-react-native"
import { StyleSheet, View } from "react-native"

import { InfiniteList } from "@/components/feed/infinite-list"
import { PersonRow } from "@/components/profile/person-row"
import { Screen, ScreenHeader } from "@/components/ui/screen"
import { UnderlineTabs } from "@/components/ui/segmented"
import { EmptyState } from "@/components/ui/surfaces"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { paths } from "@/lib/paths"
import { space } from "@/lib/theme"

export type ConnectionDirection = "followers" | "following"

export interface ConnectionsScreenProps {
  handle: string
  direction: ConnectionDirection
}

interface FollowedRowProps {
  person: PublicProfile
  people: PublicProfile[]
}

// One request for the loaded people, so each row knows whether the reader follows that person.
function FollowedRow({ person, people }: FollowedRowProps): React.JSX.Element {
  const api = useApi()
  const userIds = people.map(({ id }) => id)

  const followed = useQuery({
    queryKey: queryKeys.followedAmong(userIds),
    queryFn: () => api.follows.followedAmong(userIds),
    enabled: userIds.length > 0,
  })

  const isFollowing = followed.isSuccess ? followed.data.userIds.includes(person.id) : undefined

  return (
    <PersonRow
      key={`${person.id}-${String(isFollowing)}`}
      person={person}
      isFollowing={isFollowing}
    />
  )
}

export function ConnectionsScreen({
  handle,
  direction,
}: ConnectionsScreenProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const palette = usePalette()
  const queryClient = useQueryClient()
  const profile = queryClient.getQueryData<{ displayName: string }>(queryKeys.profile(handle))
  const name = profile?.displayName ?? `@${handle}`
  const key = queryKeys.connections({ handle, direction })

  const people = (): PublicProfile[] =>
    queryClient
      .getQueryData<{ pages: { items: PublicProfile[] }[] }>(key)
      ?.pages.flatMap((page) => page.items) ?? []

  return (
    <Screen>
      <ScreenHeader
        title={
          direction === "followers"
            ? t("web.profile.followersTitle", { name })
            : t("web.profile.followingTitle", { name })
        }
      />
      <InfiniteList<PublicProfile>
        key={direction}
        queryKey={key}
        load={(cursor) =>
          direction === "followers"
            ? api.follows.listFollowers({ handle, query: { cursor } })
            : api.follows.listFollowing({ handle, query: { cursor } })
        }
        renderItem={({ item }) => <FollowedRow person={item} people={people()} />}
        keyOf={(item) => item.id}
        header={
          <View style={styles.tabs}>
            <UnderlineTabs
              value={direction}
              onChange={(next) =>
                router.replace(
                  next === "followers" ? paths.followers(handle) : paths.following(handle),
                )
              }
              options={[
                { value: "followers", label: t("web.profile.statFollowers") },
                { value: "following", label: t("web.profile.statFollowing") },
              ]}
            />
          </View>
        }
        empty={
          <EmptyState
            icon={<Users size={32} color={palette.muted} />}
            title={
              direction === "followers"
                ? t("web.profile.noFollowers")
                : t("web.profile.noFollowing")
            }
          />
        }
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  tabs: { marginBottom: space.sm },
})
