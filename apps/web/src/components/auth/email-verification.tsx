"use client"

import { useQuery } from "@tanstack/react-query"
import { CircleCheck, Loader2 } from "lucide-react"
import Link from "next/link"

import { Button, FormBanner, useApi, useI18n } from "@contraponha/web-ui"

export interface EmailVerificationProps {
  token: string
}

// Tokens are single-use: a query keyed by the token runs exactly once, even when React
// mounts the component twice in development.
export function EmailVerification({ token }: EmailVerificationProps): React.JSX.Element {
  const { t } = useI18n()
  const api = useApi()

  const query = useQuery({
    queryKey: ["email-verification", token],
    queryFn: () => api.auth.confirmEmail({ token }),
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  })

  if (query.isPending) {
    return (
      <p role="status" className="flex items-center gap-3 text-muted">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        {t("web.auth.verifyTitle")}
      </p>
    )
  }

  if (query.isError) return <FormBanner message={t("web.auth.verifyInvalid")} />

  return (
    <div className="flex flex-col gap-5">
      <p role="status" className="flex items-center gap-3 text-success">
        <CircleCheck aria-hidden className="size-5" />
        {t("web.auth.verifyDone")}
      </p>
      <Button asChild>
        <Link href="/home">{t("web.auth.goHome")}</Link>
      </Button>
    </div>
  )
}
