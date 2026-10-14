import { queryKeys } from "@contraponha/client-core"
import type { PostView } from "@contraponha/types"
import { useLocalSearchParams } from "expo-router"
import { MessageSquareQuote } from "lucide-react-native"

import { InfiniteList } from "@/components/feed/infinite-list"
import { PostCard } from "@/components/post/post-card"
import { Screen, ScreenHeader } from "@/components/ui/screen"
import { EmptyState } from "@/components/ui/surfaces"
import { usePalette } from "@/hooks/use-palette"
import { useI18n } from "@/providers/i18n-provider"
import { useApi } from "@/providers/session-provider"

export default function PostQuotesScreen(): React.JSX.Element {
  const { postId } = useLocalSearchParams<{ postId: string }>()
  const { t } = useI18n()
  const api = useApi()
  const palette = usePalette()

  return (
    <Screen>
      <ScreenHeader title={t("web.repost.quotesTitle")} />
      <InfiniteList<PostView>
        queryKey={queryKeys.quotes(postId)}
        load={(cursor) => api.posts.listQuotes({ postId, query: { cursor } })}
        renderItem={({ item }) => <PostCard post={item} />}
        keyOf={(item) => item.id}
        isSeparated
        empty={
          <EmptyState
            icon={<MessageSquareQuote size={32} color={palette.muted} />}
            title={t("web.repost.noQuotes")}
          />
        }
      />
    </Screen>
  )
}
