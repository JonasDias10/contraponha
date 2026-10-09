import { SearchX } from "lucide-react"
import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { getRequestTranslator } from "@contraponha/next-server"
import { Button, EmptyState } from "@contraponha/web-ui"

export default async function NotFound(): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()

  return (
    <main
      id="content"
      className="mx-auto flex min-h-dvh max-w-140 flex-col items-center justify-center gap-6 px-4"
    >
      <Logo />
      <EmptyState
        icon={<SearchX className="size-8" />}
        title={t("web.errors.notFoundTitle")}
        description={t("web.errors.notFoundBody")}
      >
        <Button asChild>
          <Link href="/home">{t("web.auth.goHome")}</Link>
        </Button>
      </EmptyState>
    </main>
  )
}
