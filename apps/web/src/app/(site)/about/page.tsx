import type { Metadata } from "next"

import { LegalPageView, legalMetadata } from "@/components/legal/legal-page"

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("about")
}

export default function AboutPage(): React.JSX.Element {
  return <LegalPageView page="about" />
}
