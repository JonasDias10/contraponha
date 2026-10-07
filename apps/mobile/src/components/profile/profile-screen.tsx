import { queryKeys } from "@contraponha/client-core"
import type { ContributionView, PostView } from "@contraponha/types"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { StyleSheet, View } from "react-native"

import { ContributionCard } from "@/components/discussion/contribution-card"
import { InfiniteList } from "@/components/feed/infinite-list"
import { PostCard } from "@/components/post/post-card"
import { ProfileHeader } from "@/components/profile/profile-header"
import { Screen, ScreenHeader } from "@/components/ui/screen"
import { UnderlineTabs } from "@/components/ui/segmented"
import { EmptyState, ErrorView, LoadingView } from "@/components/ui/surfaces"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"
import { space } from "@/lib/theme"

type ProfileTab = "posts" | "contributions" | "highlighted"

export interface ProfileScreenProps {
  handle: string
  canGoBack?: boolean
}

export function ProfileScreen({ handle, canGoBack = true }: ProfileScreenProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()
  const [tab, setTab] = useState<ProfileTab>("posts")

  const query = useQuery({
    queryKey: queryKeys.profile(handle),
    queryFn: () => api.users.getByHandle(handle),
  })

  if (query.isPending || !query.data) {
    return (
      <Screen>
        {canGoBack ? <ScreenHeader /> : null}
        {query.isError ? <ErrorView onRetry={() => void query.refetch()} /> : <LoadingView />}
      </Screen>
    )
  }

  const header = (
    <View style={styles.header}>
      <ProfileHeader profile={query.data} />
      <UnderlineTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "posts", label: t("web.profile.posts") },
          { value: "contributions", label: t("web.profile.contributions") },
          { value: "highlighted", label: t("web.profile.highlighted") },
        ]}
      />
    </View>
  )

  return (
    <Screen>
      {canGoBack ? <ScreenHeader title={query.data.displayName} /> : null}
      {tab === "posts" ? (
        <InfiniteList<PostView>
          key="posts"
          queryKey={queryKeys.profilePosts(handle)}
          load={(cursor) => api.posts.listByUser({ handle, query: { cursor } })}
          renderItem={({ item }) => <PostCard post={item} />}
          keyOf={(item) => item.id}
          header={header}
          isSeparated
          empty={<EmptyState title={t("web.profile.noPosts")} />}
        />
      ) : (
        <InfiniteList<ContributionView>
          key={tab}
          queryKey={queryKeys.contributions({ handle, onlyHighlighted: tab === "highlighted" })}
          load={(cursor) =>
            api.comments.listContributions({
              handle,
              onlyHighlighted: tab === "highlighted",
              query: { cursor },
            })
          }
          renderItem={({ item }) => <ContributionCard contribution={item} />}
          keyOf={(item) => item.comment.id}
          header={header}
          isSeparated
          empty={
            <EmptyState
              title={
                tab === "highlighted"
                  ? t("web.profile.noHighlighted")
                  : t("web.profile.noContributions")
              }
            />
          }
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: space.xl, marginBottom: space.lg },
})
