"use client"

import { useEmailConfirmation } from "@contraponha/client-core/react"
import { CircleCheck, Loader2 } from "lucide-react"
import Link from "next/link"

import { Button, FormBanner, useI18n } from "@contraponha/web-ui"

export interface EmailVerificationProps {
  token: string
}

export function EmailVerification({ token }: EmailVerificationProps): React.JSX.Element {
  const { t } = useI18n()
  const query = useEmailConfirmation(token)

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
