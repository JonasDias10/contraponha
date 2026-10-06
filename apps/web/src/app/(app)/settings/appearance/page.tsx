import type { Metadata } from "next"

import { AppearanceSettings } from "@/components/settings/appearance-settings"
import { getRequestTranslator } from "@/lib/i18n"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.settings.appearance") }
}

export default function AppearanceSettingsPage(): React.JSX.Element {
  return <AppearanceSettings />
}
