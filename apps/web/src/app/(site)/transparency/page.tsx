import type { Metadata } from "next"

import { LegalPageView, legalMetadata } from "@/components/legal/legal-page"

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("transparency")
}

export default function TransparencyPage(): React.JSX.Element {
  return <LegalPageView page="transparency" />
}
