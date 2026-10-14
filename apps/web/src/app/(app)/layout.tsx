import { RealtimeConnector } from "@/components/layout/realtime-connector"
import { getViewer } from "@/lib/viewer"

interface AppLayoutProps {
  children: React.ReactNode
}

export default async function AppLayout({ children }: AppLayoutProps): Promise<React.JSX.Element> {
  const viewer = await getViewer()

  return (
    <>
      <RealtimeConnector isSignedIn={viewer !== null} />
      {children}
    </>
  )
}
