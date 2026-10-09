import { getRequestTranslator } from "@contraponha/next-server"
import type { Metadata } from "next"

import { TopicManager } from "@/components/topics/topic-manager"
import { requireAdmin } from "@/lib/viewer"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()

  return { title: t("hub.topics.title") }
}

export default async function TopicsPage(): Promise<React.JSX.Element> {
  await requireAdmin()

  return <TopicManager />
}
