"use client"

import type { MessageKey } from "@contraponha/i18n"
import {
  Bell,
  Bookmark,
  House,
  LogOut,
  PenLine,
  Search,
  Shield,
  SlidersHorizontal,
  User,
  type LucideIcon,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { canModerate } from "@contraponha/client-core"
import { useUnreadCount } from "@contraponha/client-core/react"

import { signOut } from "@/actions/auth"
import { Logo } from "@/components/brand/logo"
import {
  Avatar,
  Button,
  cn,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  useI18n,
  useViewer,
} from "@contraponha/web-ui"
import { paths } from "@/lib/paths"

interface NavItem {
  href: Route
  label: MessageKey
  Icon: LucideIcon
  isSignedInOnly: boolean
}

function navItems(handle: string | undefined): NavItem[] {
  return [
    { href: "/home", label: "web.nav.home", Icon: House, isSignedInOnly: false },
    { href: "/search", label: "web.nav.search", Icon: Search, isSignedInOnly: false },
    { href: "/notifications", label: "web.nav.notifications", Icon: Bell, isSignedInOnly: true },
    { href: "/saved", label: "web.nav.saved", Icon: Bookmark, isSignedInOnly: true },
    {
      href: handle ? paths.profile(handle) : "/login",
      label: "web.nav.profile",
      Icon: User,
      isSignedInOnly: true,
    },
    { href: "/settings", label: "web.nav.settings", Icon: SlidersHorizontal, isSignedInOnly: true },
  ]
}

interface IsCurrentParams {
  pathname: string
  href: string
}

interface BottomNavItem {
  href: Route
  label: MessageKey
  Icon: LucideIcon
}

// The moderation queue and the admin tools live in the hub, a separate app.
const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL

function isCurrent({ pathname, href }: IsCurrentParams): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SideNav(): React.JSX.Element {
  const { t } = useI18n()
  const viewer = useViewer()
  const pathname = usePathname()
  const unread = useUnreadCount({ isEnabled: viewer !== null })
  const isModerator = canModerate(viewer)
  const items = navItems(viewer?.handle).filter(({ isSignedInOnly }) => viewer || !isSignedInOnly)

  return (
    <nav
      aria-label={t("web.nav.primary")}
      className="sticky top-0 hidden h-dvh w-60 flex-none flex-col gap-6 py-6 lg:flex"
    >
      <Logo href="/home" className="px-3.5" />
      <div className="flex flex-col gap-0.5">
        {items.map(({ href, label, Icon }) => {
          const isActive = isCurrent({ pathname, href })

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-12 items-center gap-3.5 rounded-[12px] px-3.5 text-base font-medium text-ink no-underline hover:bg-surface-sunken",
                isActive && "bg-surface-sunken font-semibold",
              )}
            >
              <Icon aria-hidden className={cn("size-5", isActive ? "text-ink" : "text-muted")} />
              {t(label)}
              {href === "/notifications" && unread > 0 ? (
                <span className="ml-auto text-[13px] font-medium text-subtle">
                  {t("web.nav.newNotifications", { count: unread })}
                </span>
              ) : null}
            </Link>
          )
        })}
        {isModerator && HUB_URL ? (
          <a
            href={HUB_URL}
            target="_blank"
            rel="noopener"
            className="flex h-12 items-center gap-3.5 rounded-[12px] px-3.5 text-base font-medium text-ink no-underline hover:bg-surface-sunken"
          >
            <Shield aria-hidden className="size-5 text-muted" />
            {t("web.nav.moderation")}
          </a>
        ) : null}
      </div>
      {viewer ? (
        <>
          <Button asChild size="lg">
            <Link href="/compose">
              <PenLine aria-hidden className="size-5" />
              {t("web.nav.write")}
            </Link>
          </Button>
          <AccountMenu />
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <Button asChild size="lg">
            <Link href="/signup">{t("web.nav.signUp")}</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/login">{t("web.nav.signIn")}</Link>
          </Button>
        </div>
      )}
    </nav>
  )
}

function AccountMenu(): React.JSX.Element | null {
  const { t } = useI18n()
  const viewer = useViewer()

  if (!viewer) return null

  return (
    <Menu>
      <MenuTrigger
        aria-label={t("web.nav.accountMenu")}
        className="mt-auto flex items-center gap-3 rounded-[12px] px-1.5 py-2 text-left hover:bg-surface-sunken"
      >
        <Avatar id={viewer.id} name={viewer.displayName} src={viewer.avatarUrl} size="sm" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{viewer.displayName}</span>
          <span className="truncate text-[13px] text-subtle">@{viewer.handle}</span>
        </span>
      </MenuTrigger>
      <MenuContent align="start" side="top">
        <MenuItem asChild>
          <Link href={paths.profile(viewer.handle)}>
            <User aria-hidden className="size-4" />
            {t("web.nav.profile")}
          </Link>
        </MenuItem>
        <MenuItem asChild>
          <Link href="/settings">
            <SlidersHorizontal aria-hidden className="size-4" />
            {t("web.nav.settings")}
          </Link>
        </MenuItem>
        <MenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden className="size-4" />
          {t("web.nav.signOut")}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

// Phone width: the same destinations in a bottom bar; new activity is a dot, never a number.
export function BottomNav(): React.JSX.Element {
  const { t } = useI18n()
  const viewer = useViewer()
  const pathname = usePathname()
  const unread = useUnreadCount({ isEnabled: viewer !== null })

  const items: BottomNavItem[] = viewer
    ? [
        { href: "/home", label: "web.nav.home", Icon: House },
        { href: "/search", label: "web.nav.search", Icon: Search },
        { href: "/compose", label: "web.nav.write", Icon: PenLine },
        { href: "/notifications", label: "web.nav.notifications", Icon: Bell },
        { href: paths.profile(viewer.handle), label: "web.nav.profile", Icon: User },
      ]
    : [
        { href: "/home", label: "web.nav.home", Icon: House },
        { href: "/search", label: "web.nav.search", Icon: Search },
        { href: "/login", label: "web.nav.signIn", Icon: User },
      ]

  return (
    <nav
      aria-label={t("web.nav.primary")}
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {items.map(({ href, label, Icon }) => {
        const isActive = isCurrent({ pathname, href })

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium no-underline",
              isActive ? "text-ink" : "text-muted",
            )}
          >
            <Icon aria-hidden className="size-6" />
            {t(label)}
            {href === "/notifications" && unread > 0 ? (
              <span
                aria-hidden
                className="absolute top-2 right-[calc(50%-16px)] size-2 rounded-full bg-ink"
              />
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
