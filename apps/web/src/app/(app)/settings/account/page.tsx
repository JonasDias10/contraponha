import type { Metadata } from "next"

import { AccountSettings } from "@/components/settings/account-settings"
import { getRequestTranslator } from "@/lib/i18n"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.settings.account") }
}

export default function AccountSettingsPage(): React.JSX.Element {
  return <AccountSettings />
}
