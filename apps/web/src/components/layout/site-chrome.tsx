import type { Route } from "next"
import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { LocaleSwitcher, ThemeSwitcher } from "@/components/layout/preference-switchers"
import { Button } from "@/components/ui/button"
import { getRequestTranslator } from "@/lib/i18n"
import { getViewer } from "@/lib/viewer"

interface FooterLink {
  href: Route
  label: string
}

export async function SiteHeader(): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()
  const viewer = await getViewer()

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-8">
        <Logo />
        <nav aria-label={t("web.footer.label")} className="hidden gap-6 md:flex">
          <Link href="/about" className="text-ink no-underline hover:underline">
            {t("web.footer.about")}
          </Link>
          <Link href="/guidelines" className="text-ink no-underline hover:underline">
            {t("web.footer.guidelines")}
          </Link>
          <Link href="/transparency" className="text-ink no-underline hover:underline">
            {t("web.footer.transparency")}
          </Link>
        </nav>
        <span className="flex-1" />
        {viewer ? (
          <Button asChild>
            <Link href="/home">{t("web.nav.home")}</Link>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">{t("web.nav.signIn")}</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">{t("web.nav.signUp")}</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}

export async function SiteFooter(): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()

  const links: FooterLink[] = [
    { href: "/guidelines", label: t("web.footer.guidelines") },
    { href: "/privacy", label: t("web.footer.privacy") },
    { href: "/terms", label: t("web.footer.terms") },
    { href: "/transparency", label: t("web.footer.transparency") },
    { href: "/about", label: t("web.footer.about") },
  ]

  return (
    <footer className="border-t border-line pb-12 pt-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-6 px-4 sm:px-8">
        <Logo className="text-xl" />
        <nav
          aria-label={t("web.footer.label")}
          className="flex flex-1 flex-wrap gap-x-5 gap-y-2 text-sm"
        >
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className="text-brand underline-offset-2 hover:underline">
              {label}
            </Link>
          ))}
        </nav>
        <ThemeSwitcher />
        <LocaleSwitcher />
      </div>
    </footer>
  )
}
