import { API_READINESS_TIMEOUT_MS } from "@ponto/config"

import { ApiStatusBadge } from "@/components/ApiStatusBadge"
import { createServerApiClient } from "@/lib/api"
import { getRequestTranslator } from "@/lib/i18n"

export default async function HomePage(): Promise<React.JSX.Element> {
  const { locale, t } = await getRequestTranslator()
  const isApiReady = await createServerApiClient(locale)
    .health.isReady(AbortSignal.timeout(API_READINESS_TIMEOUT_MS))
    .catch(() => false)

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-5xl font-semibold tracking-tight">
        {t("app.name")}
        <span className="text-brand">.</span>
      </h1>
      <p className="text-xl text-muted">{t("app.tagline")}</p>
      <p className="text-base leading-relaxed">{t("app.foundationNotice")}</p>
      <ApiStatusBadge
        isReady={isApiReady}
        label={isApiReady ? t("app.apiStatus.online") : t("app.apiStatus.offline")}
      />
    </main>
  )
}
