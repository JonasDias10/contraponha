import { getRequestTranslator } from "@contraponha/next-server"
import { Button, EmptyState } from "@contraponha/web-ui"
import { ShieldAlert } from "lucide-react"

import { signOut } from "@/actions/auth"
import { HubWordmark } from "@/components/layout/hub-wordmark"

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? ""

export default async function TwoFactorRequiredPage(): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()

  return (
    <main className="mx-auto flex min-h-dvh max-w-120 flex-col items-center justify-center gap-8 px-4">
      <HubWordmark className="text-[26px]" />
      <EmptyState
        icon={<ShieldAlert className="size-8" />}
        tone="brand"
        title={t("web.twoFactor.title")}
        description={t("web.twoFactor.staffRequired")}
      >
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <a href={`${WEB_URL}/settings/account`}>{t("web.twoFactor.openSettings")}</a>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="secondary">
              {t("hub.nav.signOut")}
            </Button>
          </form>
        </div>
      </EmptyState>
    </main>
  )
}
