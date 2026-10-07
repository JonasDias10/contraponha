import { isWithinEditWindow, queryKeys } from "@contraponha/client-core"
import { useQuery } from "@tanstack/react-query"
import { useLocalSearchParams } from "expo-router"

import { Composer } from "@/components/composer/composer"
import { Screen, ScreenHeader, ScrollContent } from "@/components/ui/screen"
import { Banner, ErrorView, LoadingView } from "@/components/ui/surfaces"
import { useI18n } from "@/providers/i18n-provider"
import { useApi, useRequiredViewer } from "@/providers/session-provider"

export default function EditPostRoute(): React.JSX.Element {
  const { postId } = useLocalSearchParams<{ postId: string }>()
  const { t } = useI18n()
  const api = useApi()
  const viewer = useRequiredViewer()
  const query = useQuery({ queryKey: queryKeys.post(postId), queryFn: () => api.posts.get(postId) })

  if (query.isPending) {
    return (
      <Screen>
        <LoadingView />
      </Screen>
    )
  }

  if (!query.data) {
    return (
      <Screen>
        <ScreenHeader />
        <ErrorView onRetry={() => void query.refetch()} />
      </Screen>
    )
  }

  const post = query.data

  const isEditable =
    !post.isDeleted &&
    post.author?.id === viewer.id &&
    isWithinEditWindow({ createdAt: post.createdAt })

  if (!isEditable) {
    return (
      <Screen>
        <ScreenHeader title={t("web.composer.editTitle")} />
        <ScrollContent>
          <Banner tone="warning">{t("web.composer.editWindowOver")}</Banner>
        </ScrollContent>
      </Screen>
    )
  }

  return <Composer post={post} />
}
