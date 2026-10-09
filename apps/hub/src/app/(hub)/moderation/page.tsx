import { getRequestTranslator } from "@contraponha/next-server"
import type { Metadata } from "next"

import { ReportQueue } from "@/components/moderation/report-queue"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()

  return { title: t("hub.nav.reports") }
}

export default function ModerationPage(): React.JSX.Element {
  return <ReportQueue />
}
