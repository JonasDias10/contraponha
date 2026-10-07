import type { Metadata } from "next"

import { LegalPageView, legalMetadata } from "@/components/legal/legal-page"

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("privacy")
}

export default function PrivacyPage(): React.JSX.Element {
  return <LegalPageView page="privacy" />
}
