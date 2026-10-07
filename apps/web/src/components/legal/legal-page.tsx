import { LEGAL_DOCUMENT_VERSIONS } from "@contraponha/config"
import type { Metadata } from "next"

import { LegalDocument } from "@/components/legal/legal-document"
import { formatDate } from "@/lib/format"
import { getRequestTranslator } from "@/lib/i18n"
import { loadLegalDocument, type LegalPage } from "@/lib/legal"

const TITLE_KEYS = {
  terms: "web.footer.terms",
  privacy: "web.footer.privacy",
  guidelines: "web.footer.guidelines",
  about: "web.footer.about",
  transparency: "web.footer.transparency",
} as const

export async function legalMetadata(page: LegalPage): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t(TITLE_KEYS[page]) }
}

export interface LegalPageViewProps {
  page: LegalPage
}

function versionOf(page: LegalPage): string | null {
  return page === "terms" || page === "privacy" || page === "guidelines"
    ? LEGAL_DOCUMENT_VERSIONS[page]
    : null
}

export async function LegalPageView({ page }: LegalPageViewProps): Promise<React.JSX.Element> {
  const { t, locale } = await getRequestTranslator()
  const document = await loadLegalDocument({ page, locale })
  const version = versionOf(page)

  return (
    <article
      lang={document.locale}
      className="mx-auto flex w-full max-w-240 flex-col gap-6 px-4 py-12 sm:px-8 sm:py-16"
    >
      {version ? (
        <p className="text-[13px] text-subtle">
          {t("web.legal.updatedAt", {
            date: formatDate({ value: `${version}T12:00:00Z`, locale, now: new Date(0) }),
          })}
        </p>
      ) : null}
      <LegalDocument markdown={document.markdown} />
    </article>
  )
}
