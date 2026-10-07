"use client"

import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { useI18n } from "@/components/providers/i18n-provider"
import { paths } from "@/lib/paths"

export function SearchBox(): React.JSX.Element {
  const { t } = useI18n()
  const router = useRouter()
  const [query, setQuery] = useState("")

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault()

        if (query.trim()) router.push(paths.search(query.trim()))
      }}
    >
      <label className="flex h-11 items-center gap-2 rounded-full bg-surface-sunken px-4">
        <Search aria-hidden className="size-5 text-subtle" />
        <span className="sr-only">{t("web.nav.search")}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("web.nav.searchPlaceholder")}
          className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-subtle focus-visible:outline-none"
        />
      </label>
    </form>
  )
}
