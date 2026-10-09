"use client"

import { isAdmin } from "@contraponha/client-core"
import type { MessageKey } from "@contraponha/i18n"
import type { PrivateProfile } from "@contraponha/types"
import { Avatar, Button, cn, useI18n } from "@contraponha/web-ui"
import {
  ExternalLink,
  Flag,
  Hash,
  LayoutDashboard,
  LogOut,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { signOut } from "@/actions/auth"
import { HubWordmark } from "@/components/layout/hub-wordmark"
import { webLinks } from "@/lib/web-links"

interface NavItem {
  href: Route
  label: MessageKey
  icon: LucideIcon
  isAdminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "hub.nav.dashboard", icon: LayoutDashboard },
  { href: "/users", label: "hub.nav.users", icon: Users },
  { href: "/moderation", label: "hub.nav.reports", icon: Flag },
  { href: "/moderation/actions", label: "hub.nav.actions", icon: ScrollText },
  { href: "/topics", label: "hub.nav.topics", icon: Hash, isAdminOnly: true },
]

interface IsActiveParams {
  pathname: string
  href: string
}

// The longest matching item wins, so /moderation/actions does not also light up /moderation.
function activeHref(pathname: string): string | undefined {
  return NAV_ITEMS.map(({ href }) => href)
    .filter((href) => isUnder({ pathname, href }))
    .sort((first, second) => second.length - first.length)[0]
}

function isUnder({ pathname, href }: IsActiveParams): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

interface HubNavProps {
  viewer: PrivateProfile
}

export function HubNav({ viewer }: HubNavProps): React.JSX.Element {
  const { t } = useI18n()
  const pathname = usePathname()
  const current = activeHref(pathname)
  const items = NAV_ITEMS.filter(({ isAdminOnly }) => !isAdminOnly || isAdmin(viewer))

  return (
    <nav
      aria-label={t("hub.nav.menu")}
      className="flex flex-col gap-6 border-line px-3 py-5 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-r"
    >
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="px-3 no-underline">
          <HubWordmark className="text-[22px]" />
        </Link>
        <form action={signOut} className="lg:hidden">
          <Button type="submit" variant="ghost" size="iconSm" aria-label={t("hub.nav.signOut")}>
            <LogOut aria-hidden className="size-4" />
          </Button>
        </form>
      </div>
      <ul className="flex gap-1 overflow-x-auto lg:flex-col">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = href === current

          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-[15px] font-medium text-ink no-underline hover:bg-surface-sunken",
                  isActive && "bg-surface-sunken font-semibold",
                )}
              >
                <Icon aria-hidden className={cn("size-5", isActive ? "text-ink" : "text-muted")} />
                {t(label)}
              </Link>
            </li>
          )
        })}
      </ul>
      <div className="mt-auto hidden flex-col gap-3 border-t border-line pt-4 lg:flex">
        <a
          href={webLinks.home()}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-2 px-3 text-sm text-muted no-underline hover:text-ink"
        >
          <ExternalLink aria-hidden className="size-4" />
          {t("hub.nav.openApp")}
        </a>
        <div className="flex items-center gap-3 px-3">
          <Avatar id={viewer.id} name={viewer.displayName} src={viewer.avatarUrl} size="sm" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{viewer.displayName}</span>
            <span className="truncate text-[13px] text-subtle">
              {t(`hub.roles.${viewer.role}`)}
            </span>
          </div>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
            <LogOut aria-hidden className="size-4" />
            {t("hub.nav.signOut")}
          </Button>
        </form>
      </div>
    </nav>
  )
}
