import type { Metadata } from "next"

import { AppShell } from "@/components/layout/app-shell"
import { ConnectionsList } from "@/components/profile/connections-list"
import { getRequestTranslator } from "@contraponha/next-server"
import { loadProfile } from "@/lib/load-profile"

export async function generateMetadata({
  params,
}: PageProps<"/u/[handle]/following">): Promise<Metadata> {
  const { handle } = await params
  const { t } = await getRequestTranslator()
  const profile = await loadProfile(decodeURIComponent(handle))

  return { title: t("web.profile.followingTitle", { name: profile.displayName }) }
}

export default async function FollowingPage({
  params,
}: PageProps<"/u/[handle]/following">): Promise<React.JSX.Element> {
  const { handle } = await params
  const profile = await loadProfile(decodeURIComponent(handle))

  return (
    <AppShell>
      <ConnectionsList
        handle={profile.handle}
        displayName={profile.displayName}
        direction="following"
      />
    </AppShell>
  )
}
