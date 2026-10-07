import { useLocalSearchParams } from "expo-router"

import { ProfileScreen } from "@/components/profile/profile-screen"

export default function UserProfileRoute(): React.JSX.Element {
  const { handle } = useLocalSearchParams<{ handle: string }>()

  return <ProfileScreen handle={handle} />
}
