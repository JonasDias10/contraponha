import type { Metadata } from "next"

import { ProfileSettings } from "@/components/settings/profile-settings"
import { getRequestTranslator } from "@/lib/i18n"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.settings.profile") }
}

export default function ProfileSettingsPage(): React.JSX.Element {
  return <ProfileSettings />
}
