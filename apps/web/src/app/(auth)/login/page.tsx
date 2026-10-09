import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { AuthHeading } from "@/components/auth/auth-heading"
import { SignInForm } from "@/components/auth/sign-in-form"
import { getRequestTranslator } from "@contraponha/next-server"
import { getViewer } from "@/lib/viewer"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.auth.signInTitle") }
}

export default async function SignInPage(): Promise<React.JSX.Element> {
  const viewer = await getViewer()

  if (viewer) redirect("/home")

  const { t } = await getRequestTranslator()

  return (
    <>
      <AuthHeading
        title={t("web.auth.signInTitle")}
        lead={
          <>
            {t("web.auth.noAccount")}{" "}
            <Link href="/signup" className="text-brand underline">
              {t("web.auth.createAccount")}
            </Link>
          </>
        }
      />
      <SignInForm />
    </>
  )
}
