import { Check } from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { getRequestTranslator } from "@contraponha/next-server"

const ASIDE_POINTS = [
  "web.auth.asidePointReactions",
  "web.auth.asidePointFeeds",
  "web.auth.asidePointTransparency",
] as const

interface AuthLayoutProps {
  children: React.ReactNode
}

export default async function AuthLayout({
  children,
}: AuthLayoutProps): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex min-w-0 flex-col justify-between gap-8 border-b border-line px-5 py-4 sm:px-8 lg:flex-1 lg:border-b-0 lg:bg-surface-sunken lg:px-16 lg:py-12">
        <Logo className="text-[22px] lg:text-[30px]" />
        <div className="hidden max-w-130 flex-col gap-6 lg:flex">
          <p className="font-serif text-[32px] leading-tight font-semibold">
            {t("web.auth.asideTitle")}
          </p>
          <ul className="flex flex-col gap-3 text-muted">
            {ASIDE_POINTS.map((key) => (
              <li key={key} className="flex gap-3">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-brand" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
        <p className="hidden text-[13px] text-subtle lg:block">{t("web.auth.asideNote")}</p>
      </aside>
      <main
        id="content"
        className="flex min-w-0 flex-1 justify-center px-5 pt-8 pb-12 sm:px-8 sm:pt-12 lg:items-center lg:px-16 lg:py-12"
      >
        <div className="flex w-full max-w-110 flex-col gap-5">{children}</div>
      </main>
    </div>
  )
}
