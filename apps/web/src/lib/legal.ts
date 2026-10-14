import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"

import { DEFAULT_LOCALE, type Locale } from "@contraponha/i18n"

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

// Contact addresses in the legal texts come from the environment, so the texts stay the
// same across deployments and no address is hardcoded in the repository.
const CONTACTS = {
  dpoEmail: process.env.LEGAL_DPO_EMAIL,
  contactEmail: process.env.LEGAL_CONTACT_EMAIL,
  transparencyEmail: process.env.LEGAL_TRANSPARENCY_EMAIL,
} as const

const UNSET_CONTACT = "**[e-mail não configurado]**"

function fillContacts(markdown: string): string {
  return markdown.replace(
    /\{\{(dpoEmail|contactEmail|transparencyEmail)\}\}/g,
    (_match, key: keyof typeof CONTACTS) => {
      const email = CONTACTS[key]

      return email ? `[${email}](mailto:${email})` : UNSET_CONTACT
    },
  )
}

// Each page exists in Portuguese; translations are used when present, and the Portuguese
// text remains the one that prevails.
export async function loadLegalDocument({
  page,
  locale,
}: LoadLegalParams): Promise<LegalDocumentContent> {
  try {
    const markdown = await readFile(path.join(CONTENT_DIR, `${page}.${locale}.md`), "utf8")

    return { markdown: fillContacts(markdown), locale }
  } catch {
    const markdown = await readFile(path.join(CONTENT_DIR, `${page}.${DEFAULT_LOCALE}.md`), "utf8")

    return { markdown: fillContacts(markdown), locale: DEFAULT_LOCALE }
  }
}
