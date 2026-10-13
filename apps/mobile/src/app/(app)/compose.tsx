import { useLocalSearchParams } from "expo-router"

import { Composer } from "@/components/composer/composer"

// `quote` opens the composer quoting that post.
export default function ComposeRoute(): React.JSX.Element {
  const { quote } = useLocalSearchParams<{ quote?: string }>()

  return <Composer quotedPostId={quote} />
}
