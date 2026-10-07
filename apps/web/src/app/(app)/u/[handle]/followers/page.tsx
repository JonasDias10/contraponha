import type { Metadata } from "next"

import { AppShell } from "@/components/layout/app-shell"
import { ConnectionsList } from "@/components/profile/connections-list"
import { getRequestTranslator } from "@/lib/i18n"
import { loadProfile } from "@/lib/load-profile"

export async function generateMetadata({
  params,
}: PageProps<"/u/[handle]/followers">): Promise<Metadata> {
  const { handle } = await params
  const { t } = await getRequestTranslator()
  const profile = await loadProfile(decodeURIComponent(handle))

  return { title: t("web.profile.followersTitle", { name: profile.displayName }) }
}

export default async function FollowersPage({
  params,
}: PageProps<"/u/[handle]/followers">): Promise<React.JSX.Element> {
  const { handle } = await params
  const profile = await loadProfile(decodeURIComponent(handle))

  return (
    <AppShell>
      <ConnectionsList
        handle={profile.handle}
        displayName={profile.displayName}
        direction="followers"
      />
    </AppShell>
  )
}
