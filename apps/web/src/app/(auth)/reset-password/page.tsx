import type { Metadata } from "next"

import { AuthHeading } from "@/components/auth/auth-heading"
import { FormBanner } from "@contraponha/web-ui"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { getRequestTranslator } from "@contraponha/next-server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.auth.resetTitle") }
}

export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()
  const { token } = await searchParams

  return (
    <>
      <AuthHeading title={t("web.auth.resetTitle")} lead={t("web.auth.resetLead")} />
      {typeof token === "string" ? (
        <ResetPasswordForm token={token} />
      ) : (
        <FormBanner message={t("web.auth.linkInvalid")} />
      )}
    </>
  )
}
