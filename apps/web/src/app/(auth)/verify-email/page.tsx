import type { Metadata } from "next"

import { AuthHeading } from "@/components/auth/auth-heading"
import { EmailVerification } from "@/components/auth/email-verification"
import { FormBanner } from "@contraponha/web-ui"
import { getRequestTranslator } from "@contraponha/next-server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.auth.verifyTitle") }
}

export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()
  const { token } = await searchParams

  return (
    <>
      <AuthHeading title={t("web.auth.verifyTitle")} />
      {typeof token === "string" ? (
        <EmailVerification token={token} />
      ) : (
        <FormBanner message={t("web.auth.verifyInvalid")} />
      )}
    </>
  )
}
