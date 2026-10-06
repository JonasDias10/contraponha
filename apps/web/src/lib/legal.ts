import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { DEFAULT_LOCALE, type Locale } from "@ponto/i18n"

export const LEGAL_PAGES = ["terms", "privacy", "guidelines", "about", "transparency"] as const

export type LegalPage = (typeof LEGAL_PAGES)[number]

export interface LegalDocumentContent {
  markdown: string
  locale: Locale
}

export interface LoadLegalParams {
  page: LegalPage
  locale: Locale
}

const CONTENT_DIR = path.join(process.cwd(), "content", "legal")

// Each page exists in Portuguese; translations are used when present, and the Portuguese
// text remains the one that prevails.
export async function loadLegalDocument({
  page,
  locale,
}: LoadLegalParams): Promise<LegalDocumentContent> {
  try {
    const markdown = await readFile(path.join(CONTENT_DIR, `${page}.${locale}.md`), "utf8")
    return { markdown, locale }
  } catch {
    const markdown = await readFile(path.join(CONTENT_DIR, `${page}.${DEFAULT_LOCALE}.md`), "utf8")
    return { markdown, locale: DEFAULT_LOCALE }
  }
}
