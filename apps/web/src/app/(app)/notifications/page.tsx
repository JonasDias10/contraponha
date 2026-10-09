import type { Metadata } from "next"

import { AppShell } from "@/components/layout/app-shell"
import { NotificationList } from "@/components/notifications/notification-list"
import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences"
import { getRequestTranslator } from "@contraponha/next-server"
import { Card } from "@contraponha/web-ui"
import { requireViewer } from "@/lib/viewer"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.notifications.title") }
}

export default async function NotificationsPage(): Promise<React.JSX.Element> {
  await requireViewer()

  const { t } = await getRequestTranslator()

  return (
    <AppShell
      rail={
        <Card className="flex flex-col gap-4 p-5">
          <h2 className="font-semibold">{t("web.notifications.preferencesTitle")}</h2>
          <NotificationPreferencesForm showDigest={false} />
        </Card>
      }
    >
      <NotificationList />
    </AppShell>
  )
}
