import type { Route } from "next"
import Link from "next/link"

import { Logo } from "@/components/brand/logo"
import { LocaleSwitcher, ThemeSwitcher } from "@/components/layout/preference-switchers"
import { getRequestTranslator } from "@contraponha/next-server"
import { Button } from "@contraponha/web-ui"
import { getViewer } from "@/lib/viewer"

interface FooterLink {
  href: Route
  label: string
}

interface FooterGroup {
  title: string
  links: FooterLink[]
}

export async function SiteHeader(): Promise<React.JSX.Element> {
  const { t } = await getRequestTranslator()
  const viewer = await getViewer()

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-300 items-center gap-1.5 px-4 sm:gap-6 sm:px-8">
        <Logo className="text-[19px] min-[400px]:text-[22px] sm:text-[26px]" />
        <nav aria-label={t("web.footer.label")} className="hidden gap-6 text-[15px] md:flex">
          <Link href="/about" className="text-muted no-underline hover:text-ink">
            {t("web.footer.about")}
          </Link>
          <Link href="/guidelines" className="text-muted no-underline hover:text-ink">
            {t("web.footer.guidelines")}
          </Link>
          <Link href="/transparency" className="text-muted no-underline hover:text-ink">
            {t("web.footer.transparency")}
          </Link>
        </nav>
        <span className="flex-1" />
        {viewer ? (
          <Button asChild size="sm" className="sm:h-11 sm:px-5 sm:text-[15px]">
            <Link href="/home">{t("web.nav.home")}</Link>
          </Button>
        ) : (
          <div className="flex gap-0.5 sm:gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="px-2.5 min-[400px]:px-3 sm:h-11 sm:px-5 sm:text-[15px]"
            >
              <Link href="/login">{t("web.nav.signIn")}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              className="hidden px-3 min-[360px]:inline-flex sm:h-11 sm:px-5 sm:text-[15px]"
            >
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

  const groups: FooterGroup[] = [
    {
      title: t("web.footer.productTitle"),
      links: [
        { href: "/about", label: t("web.footer.about") },
        { href: "/transparency", label: t("web.footer.transparency") },
      ],
    },
    {
      title: t("web.footer.communityTitle"),
      links: [{ href: "/guidelines", label: t("web.footer.guidelines") }],
    },
    {
      title: t("web.footer.legalTitle"),
      links: [
        { href: "/privacy", label: t("web.footer.privacy") },
        { href: "/terms", label: t("web.footer.terms") },
      ],
    },
  ]

  return (
    <footer className="border-t border-line bg-surface-sunken">
      <div className="mx-auto flex w-full max-w-300 flex-col gap-10 px-4 pt-12 pb-10 sm:px-8 md:flex-row md:justify-between">
        <div className="flex max-w-80 flex-col gap-3">
          <Logo className="text-[22px]" />
          <p className="text-sm text-muted">{t("app.tagline")}</p>
        </div>
        <nav
          aria-label={t("web.footer.label")}
          className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:gap-x-16"
        >
          {groups.map(({ title, links }) => (
            <div key={title} className="flex flex-col gap-3">
              <h2 className="text-xs font-semibold tracking-[0.08em] text-subtle uppercase">
                {title}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-ink no-underline hover:text-brand">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-300 flex-col-reverse gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-[13px] text-subtle">
            {t("web.footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <ThemeSwitcher />
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </footer>
  )
}
