import { ViewerProvider } from "@contraponha/web-ui"

import { HubNav } from "@/components/layout/hub-nav"
import { requireStaff } from "@/lib/viewer"

interface HubLayoutProps {
  children: React.ReactNode
}

export default async function HubLayout({ children }: HubLayoutProps): Promise<React.JSX.Element> {
  const viewer = await requireStaff()

  return (
    <ViewerProvider viewer={viewer}>
      <div className="flex min-h-dvh flex-col lg:flex-row">
        <HubNav viewer={viewer} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">
          <div className="mx-auto flex max-w-280 flex-col gap-6">{children}</div>
        </main>
      </div>
    </ViewerProvider>
  )
}
