export const MINIMUM_AGE_YEARS = 16

export const LEGAL_DOCUMENTS = ["terms", "privacy", "guidelines"] as const

export type LegalDocumentName = (typeof LEGAL_DOCUMENTS)[number]

// Bump a version when the document changes; people are asked to accept it again.
export const LEGAL_DOCUMENT_VERSIONS = {
  terms: "2026-10-06",
  privacy: "2026-10-06",
  guidelines: "2026-10-06",
} as const satisfies Record<LegalDocumentName, string>

export interface AgeCheckParams {
  birthDate: string
  today?: Date
}

// birthDate is an ISO calendar date (YYYY-MM-DD).
export function ageInYears({ birthDate, today = new Date() }: AgeCheckParams): number {
  const [year = 0, month = 1, day = 1] = birthDate.split("-").map(Number)

  const hasHadBirthday =
    today.getUTCMonth() + 1 > month ||
    (today.getUTCMonth() + 1 === month && today.getUTCDate() >= day)

  return today.getUTCFullYear() - year - (hasHadBirthday ? 0 : 1)
}
