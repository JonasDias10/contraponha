import { useLocalSearchParams } from "expo-router"

import { ConnectionsScreen } from "@/components/profile/connections-screen"

export default function FollowingRoute(): React.JSX.Element {
  const { handle } = useLocalSearchParams<{ handle: string }>()

  return <ConnectionsScreen handle={handle} direction="following" />
}
