import type { Metadata } from "next"

import { AuthHeading } from "@/components/auth/auth-heading"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { getRequestTranslator } from "@contraponha/next-server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.auth.forgotTitle") }
}

export default async function ForgotPasswordPage(): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()

  return (
    <>
      <AuthHeading title={t("web.auth.forgotTitle")} lead={t("web.auth.forgotLead")} />
      <ForgotPasswordForm />
    </>
  )
}
