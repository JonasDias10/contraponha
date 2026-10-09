import type { Metadata } from "next"
import { Suspense } from "react"

import { AppShell } from "@/components/layout/app-shell"
import { SearchFilters } from "@/components/search/search-filters"
import { SearchResults } from "@/components/search/search-results"
import { getRequestTranslator } from "@contraponha/next-server"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.nav.search") }
}

export default function SearchPage(): React.JSX.Element {
  return (
    <AppShell
      rail={
        <Suspense>
          <SearchFilters />
        </Suspense>
      }
    >
      <Suspense>
        <SearchResults />
      </Suspense>
    </AppShell>
  )
}
