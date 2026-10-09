"use client"

import { Button, EmptyState, useI18n } from "@contraponha/web-ui"
import { WifiOff } from "lucide-react"

interface ErrorPageProps {
  retry: () => void
}

export default function ErrorPage({ retry }: ErrorPageProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-140 flex-col items-center justify-center px-4">
      <EmptyState
        icon={<WifiOff className="size-8" />}
        tone="danger"
        title={t("web.errors.errorTitle")}
        description={t("web.errors.errorBody")}
      >
        <Button onClick={retry}>{t("web.common.retry")}</Button>
      </EmptyState>
    </main>
  )
}
