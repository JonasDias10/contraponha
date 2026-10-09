import { getRequestTranslator } from "@contraponha/next-server"
import type { Metadata } from "next"

import { ActionLog } from "@/components/moderation/action-log"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()

  return { title: t("hub.nav.actions") }
}

export default function ActionsPage(): React.JSX.Element {
  return <ActionLog />
}
