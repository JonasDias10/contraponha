import type { Metadata } from "next"

import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences"
import { SettingsSection } from "@/components/settings/settings-section"
import { getRequestTranslator } from "@contraponha/next-server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.settings.notifications") }
}

export default async function NotificationSettingsPage(): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()

  return (
    <SettingsSection title={t("web.notifications.preferencesTitle")}>
      <NotificationPreferencesForm />
    </SettingsSection>
  )
}
