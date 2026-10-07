import { ProfileScreen } from "@/components/profile/profile-screen"
import { useRequiredViewer } from "@/providers/session-provider"

export default function MyProfileTab(): React.JSX.Element {
  const viewer = useRequiredViewer()

  return <ProfileScreen handle={viewer.handle} canGoBack={false} />
}
