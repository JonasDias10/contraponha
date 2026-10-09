import { getRequestTranslator } from "@contraponha/next-server"
import { canModerate } from "@contraponha/client-core"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { LoginForm } from "@/components/auth/login-form"
import { HubWordmark } from "@/components/layout/hub-wordmark"
import { getViewer } from "@/lib/viewer"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()

  return { title: t("hub.login.title") }
}

export default async function LoginPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()

  if (canModerate(viewer)) redirect("/")

  const { t } = await getRequestTranslator()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-100 flex-col justify-center gap-8 px-4 py-12">
      <HubWordmark className="text-[28px]" />
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[28px] leading-tight font-semibold">
          {t("hub.login.title")}
        </h1>
        <p className="text-muted">{t("hub.login.lead")}</p>
      </div>
      <LoginForm />
    </main>
  )
}
