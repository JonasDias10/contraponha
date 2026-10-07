import type { Metadata } from "next"

import { AppShell } from "@/components/layout/app-shell"
import { ReportQueue } from "@/components/moderation/report-queue"
import { getRequestTranslator } from "@/lib/i18n"
import { requireModerator } from "@/lib/require-moderator"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.moderation.title") }
}

export default async function ModerationPage(): Promise<React.JSX.Element> {
  await requireModerator()

  return (
    <AppShell>
      <ReportQueue />
    </AppShell>
  )
}
