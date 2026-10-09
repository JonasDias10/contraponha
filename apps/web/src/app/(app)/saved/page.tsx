import type { Metadata } from "next"

import { AppShell } from "@/components/layout/app-shell"
import { SavedPosts } from "@/components/feed/saved-posts"
import { getRequestTranslator } from "@contraponha/next-server"
import { requireViewer } from "@/lib/viewer"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.saved.title") }
}

export default async function SavedPage(): Promise<React.JSX.Element> {
  await requireViewer()

  return (
    <AppShell>
      <SavedPosts />
    </AppShell>
  )
}
