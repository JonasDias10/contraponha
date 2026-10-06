import type { Metadata } from "next"

import { AuthHeading } from "@/components/auth/auth-heading"
import { EmailRequestForm } from "@/components/auth/email-request-form"
import { getRequestTranslator } from "@/lib/i18n"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.auth.forgotTitle") }
}

export default async function ForgotPasswordPage(): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()

  return (
    <>
      <AuthHeading title={t("web.auth.forgotTitle")} lead={t("web.auth.forgotLead")} />
      <EmailRequestForm purpose="password-reset" />
    </>
  )
}
