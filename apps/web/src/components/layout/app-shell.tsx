import { BottomNav, SideNav } from "@/components/layout/app-nav"
import { cn, ViewerProvider } from "@contraponha/web-ui"
import { getViewer } from "@/lib/viewer"

export interface AppShellProps {
  rail?: React.ReactNode
  wide?: boolean
  children: React.ReactNode
}

// Navigation on the left, the reading column in the middle (680px max) and an optional
// rail on the right, as in the design. Below 1024px the nav moves to the bottom.
export async function AppShell({
  rail,
  wide = false,
  children,
}: AppShellProps): Promise<React.JSX.Element> {
  const viewer = await getViewer()

  return (
    <ViewerProvider viewer={viewer}>
      <div className="mx-auto flex w-full max-w-340 gap-8 px-4 sm:px-8">
        <SideNav />
        <main
          id="content"
          className={cn("min-w-0 flex-1 pt-6 pb-24 lg:pb-16", wide ? "max-w-260" : "max-w-170")}
        >
          {children}
        </main>
        {rail ? (
          <aside className="hidden w-[320px] flex-none flex-col gap-5 py-6 xl:flex">{rail}</aside>
        ) : null}
      </div>
      <BottomNav />
    </ViewerProvider>
  )
}
