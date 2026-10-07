import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome"
import { ViewerProvider } from "@/components/providers/viewer-provider"
import { getViewer } from "@/lib/viewer"

interface SiteLayoutProps {
  children: React.ReactNode
}

export default async function SiteLayout({
  children,
}: SiteLayoutProps): Promise<React.JSX.Element> {
  const viewer = await getViewer()

  return (
    <ViewerProvider viewer={viewer}>
      <SiteHeader />
      <main id="content">{children}</main>
      <SiteFooter />
    </ViewerProvider>
  )
}
