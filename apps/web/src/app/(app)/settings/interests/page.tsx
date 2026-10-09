import type { Metadata } from "next"

import { InterestsSettings } from "@/components/settings/interests-settings"
import { getRequestTranslator } from "@contraponha/next-server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.settings.interests") }
}

export default function InterestsSettingsPage(): React.JSX.Element {
  return <InterestsSettings />
}
