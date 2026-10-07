import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import type { Metadata } from "next"
import { Suspense } from "react"
import { queryKeys } from "@contraponha/client-core"

import { AppShell } from "@/components/layout/app-shell"
import { ProfileHeader } from "@/components/profile/profile-header"
import { ProfileRail } from "@/components/profile/profile-rail"
import { ProfileTabs } from "@/components/profile/profile-tabs"
import { loadProfile } from "@/lib/load-profile"
import { getServerQueryClient } from "@/lib/server-query"

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params
  const profile = await loadProfile(decodeURIComponent(handle))

  return {
    title: `${profile.displayName} (@${profile.handle})`,
    description: profile.bio ?? undefined,
  }
}

export default async function ProfilePage({
  params,
}: PageProps<"/u/[handle]">): Promise<React.JSX.Element> {
  const { handle: rawHandle } = await params
  const handle = decodeURIComponent(rawHandle).toLowerCase()
  const profile = await loadProfile(handle)
  const queryClient = getServerQueryClient()

  queryClient.setQueryData(queryKeys.profile(handle), profile)

  return (
    <AppShell
      rail={
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ProfileRail handle={handle} />
        </HydrationBoundary>
      }
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <div className="flex flex-col gap-6">
          <ProfileHeader handle={handle} />
          <Suspense>
            <ProfileTabs handle={handle} />
          </Suspense>
        </div>
      </HydrationBoundary>
    </AppShell>
  )
}
