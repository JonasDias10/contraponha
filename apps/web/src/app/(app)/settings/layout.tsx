import { AppShell } from "@/components/layout/app-shell"
import { SettingsNav } from "@/components/settings/settings-nav"
import { getRequestTranslator } from "@/lib/i18n"
import { requireViewer } from "@/lib/viewer"

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps): Promise<React.JSX.Element> {
  await requireViewer()

  const { t } = await getRequestTranslator()

  return (
    <AppShell wide>
      <h1 className="mb-6 font-serif text-[34px] font-semibold">{t("web.settings.title")}</h1>
      <div className="flex flex-col gap-8 md:flex-row">
        <SettingsNav />
        <div className="flex min-w-0 max-w-[720px] flex-1 flex-col gap-6">{children}</div>
      </div>
    </AppShell>
  )
}
