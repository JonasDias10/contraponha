import type { Metadata } from "next"

import { AppShell } from "@/components/layout/app-shell"
import { ActionLog } from "@/components/moderation/action-log"
import { getRequestTranslator } from "@/lib/i18n"
import { requireModerator } from "@/lib/require-moderator"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.moderation.actions") }
}

export default async function ModerationActionsPage(): Promise<React.JSX.Element> {
  await requireModerator()

  return (
    <AppShell>
      <ActionLog />
    </AppShell>
  )
}
