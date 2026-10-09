"use client"

import type { MessageKey } from "@contraponha/i18n"
import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn, useI18n } from "@contraponha/web-ui"

interface Section {
  href: Route
  label: MessageKey
}

const SECTIONS: Section[] = [
  { href: "/settings", label: "web.settings.profile" },
  { href: "/settings/account", label: "web.settings.account" },
  { href: "/settings/notifications", label: "web.settings.notifications" },
  { href: "/settings/interests", label: "web.settings.interests" },
  { href: "/settings/data", label: "web.settings.data" },
  { href: "/settings/appearance", label: "web.settings.appearance" },
]

export function SettingsNav(): React.JSX.Element {
  const { t } = useI18n()
  const pathname = usePathname()

  return (
    <nav
      aria-label={t("web.settings.sections")}
      className="flex gap-1 overflow-x-auto md:w-56 md:flex-none md:flex-col"
    >
      {SECTIONS.map(({ href, label }) => {
        const isActive = pathname === href

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex h-11 items-center rounded-md px-3.5 text-[15px] font-medium whitespace-nowrap text-ink no-underline hover:bg-surface-sunken",
              isActive && "bg-surface-sunken font-semibold",
            )}
          >
            {t(label)}
          </Link>
        )
      })}
    </nav>
  )
}
