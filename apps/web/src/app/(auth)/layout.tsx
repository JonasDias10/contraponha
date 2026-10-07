import { Check } from "lucide-react"

import { Logo } from "@/components/brand/logo"
import { getRequestTranslator } from "@/lib/i18n"

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
    <div className="flex min-h-dvh flex-wrap">
      <aside className="flex min-w-0 flex-[1_1_480px] flex-col justify-between gap-8 bg-surface-sunken px-6 py-10 sm:px-16 sm:py-12">
        <Logo className="text-[30px]" />
        <div className="hidden max-w-130 flex-col gap-6 md:flex">
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
        <p className="hidden text-[13px] text-subtle md:block">{t("web.auth.asideNote")}</p>
      </aside>
      <main
        id="content"
        className="flex min-w-0 flex-[1_1_520px] items-center justify-center px-6 py-12 sm:px-16"
      >
        <div className="flex w-full max-w-110 flex-col gap-5">{children}</div>
      </main>
    </div>
  )
}
