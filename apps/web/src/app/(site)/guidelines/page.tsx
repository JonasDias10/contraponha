import type { Metadata } from "next"

import { LegalPageView, legalMetadata } from "@/components/legal/legal-page"

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("guidelines")
}

export default function GuidelinesPage(): React.JSX.Element {
  return <LegalPageView page="guidelines" />
}
