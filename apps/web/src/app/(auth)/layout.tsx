import { Logo } from "@/components/brand/logo"
import { Avatar } from "@/components/ui/avatar"
import { getRequestTranslator } from "@/lib/i18n"

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
        <figure className="hidden max-w-130 flex-col gap-5 md:flex">
          <blockquote className="font-serif text-[32px] leading-[1.35] italic">
            {t("web.auth.asideQuote")}
          </blockquote>
          <figcaption className="flex items-center gap-3">
            <Avatar id="aside-quote" name={t("web.auth.asideAuthor")} />
            <span className="flex flex-col">
              <span className="font-semibold">{t("web.auth.asideAuthor")}</span>
              <span className="text-sm text-muted">{t("web.auth.asideRole")}</span>
            </span>
          </figcaption>
        </figure>
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
