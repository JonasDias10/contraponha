import type { Metadata } from "next"

import { RelationsSettings } from "@/components/settings/relations-settings"
import { getRequestTranslator } from "@contraponha/next-server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.relations.settingsTitle") }
}

export default function PrivacySettingsPage(): React.JSX.Element {
  return <RelationsSettings />
}
