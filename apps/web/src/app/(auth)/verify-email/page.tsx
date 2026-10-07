import type { Metadata } from "next"

import { AuthHeading } from "@/components/auth/auth-heading"
import { FormBanner } from "@/components/auth/form-banner"
import { TokenConfirmation } from "@/components/auth/token-confirmation"
import { getRequestTranslator } from "@/lib/i18n"

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
        <TokenConfirmation purpose="verify-email" token={token} />
      ) : (
        <FormBanner message={t("web.auth.verifyInvalid")} />
      )}
    </>
  )
}
