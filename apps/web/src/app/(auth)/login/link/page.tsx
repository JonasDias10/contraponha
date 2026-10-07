import type { Metadata } from "next"

import { AuthHeading } from "@/components/auth/auth-heading"
import { EmailRequestForm } from "@/components/auth/email-request-form"
import { TokenConfirmation } from "@/components/auth/token-confirmation"
import { getRequestTranslator } from "@/lib/i18n"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.auth.magicLinkTitle") }
}

export default async function MagicLinkPage({
  searchParams,
}: PageProps<"/login/link">): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()
  const { token } = await searchParams

  return (
    <>
      <AuthHeading
        title={t("web.auth.magicLinkTitle")}
        lead={token ? undefined : t("web.auth.magicLinkLead")}
      />
      {typeof token === "string" ? (
        <TokenConfirmation purpose="magic-link" token={token} />
      ) : (
        <EmailRequestForm purpose="magic-link" />
      )}
    </>
  )
}
