"use client"

import { SUPPORTED_LOCALES, type Locale } from "@contraponha/i18n"
import { Globe, Monitor, Moon, Sun } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { changeLocale } from "@/actions/preferences"
import { useIsClient } from "@/hooks/use-is-client"
import { useTheme } from "@/hooks/use-theme"
import { useI18n } from "@/components/providers/i18n-provider"

const LOCALE_NAMES: Record<Locale, string> = {
  "pt-BR": "Português (Brasil)",
  en: "English",
  es: "Español",
}

export function LocaleSwitcher(): React.JSX.Element {
  const { locale, t } = useI18n()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const next = event.target.value

    startTransition(async () => {
      await changeLocale(next)

      router.refresh()
    })
  }

  return (
    <label className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-line-strong bg-surface-raised px-3 text-sm">
      <Globe aria-hidden className="size-4 text-muted" />
      <span className="sr-only">{t("web.footer.language")}</span>
      <select
        value={locale}
        onChange={handleChange}
        disabled={isPending}
        className="bg-transparent font-medium focus-visible:outline-none"
      >
        {SUPPORTED_LOCALES.map((option) => (
          <option key={option} value={option}>
            {LOCALE_NAMES[option]}
          </option>
        ))}
      </select>
    </label>
  )
}

const THEMES = [
  { value: "system", Icon: Monitor, key: "web.footer.themeSystem" },
  { value: "light", Icon: Sun, key: "web.footer.themeLight" },
  { value: "dark", Icon: Moon, key: "web.footer.themeDark" },
] as const

export function ThemeSwitcher(): React.JSX.Element {
  const { t } = useI18n()
  const { theme, setTheme } = useTheme()
  const isClient = useIsClient()

  return (
    <div
      role="radiogroup"
      aria-label={t("web.footer.theme")}
      className="inline-flex gap-1 rounded-md bg-surface-sunken p-1"
    >
      {THEMES.map(({ value, Icon, key }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={isClient && theme === value}
          aria-label={t(key)}
          title={t(key)}
          onClick={() => setTheme(value)}
          className="grid size-8 place-items-center rounded-[7px] text-muted aria-checked:bg-surface-raised aria-checked:text-ink aria-checked:shadow-e1"
        >
          <Icon aria-hidden className="size-4" />
        </button>
      ))}
    </div>
  )
}
