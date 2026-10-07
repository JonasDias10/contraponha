import type { Metadata } from "next"

import { DataSettings } from "@/components/settings/data-settings"
import { getRequestTranslator } from "@/lib/i18n"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.settings.data") }
}

export default function DataSettingsPage(): React.JSX.Element {
  return <DataSettings />
}
