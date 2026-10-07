import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthHeading } from "@/components/auth/auth-heading"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { getRequestTranslator } from "@/lib/i18n"
import { getViewer } from "@/lib/viewer"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.auth.signUpTitle") }
}

export default async function SignUpPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()

  if (viewer) redirect("/home")

  const { t } = await getRequestTranslator()

  return (
    <>
      <AuthHeading
        title={t("web.auth.signUpTitle")}
        lead={
          <>
            {t("web.auth.haveAccount")}{" "}
            <Link href="/login" className="text-brand underline">
              {t("web.auth.signIn")}
            </Link>
          </>
        }
      />
      <SignUpForm />
    </>
  )
}
