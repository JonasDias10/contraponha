import type { Metadata } from "next"

import { LegalPageView, legalMetadata } from "@/components/legal/legal-page"

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("terms")
}

export default function TermsPage(): React.JSX.Element {
  return <LegalPageView page="terms" />
}
