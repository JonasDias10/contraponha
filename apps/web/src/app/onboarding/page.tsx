import type { Metadata } from "next"

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { ViewerProvider } from "@contraponha/web-ui"
import { getRequestTranslator } from "@contraponha/next-server"
import { requireViewer } from "@/lib/viewer"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.onboarding.interestsTitle") }
}

export default async function OnboardingPage(): Promise<React.JSX.Element> {
  const viewer = await requireViewer()

  return (
    <ViewerProvider viewer={viewer}>
      <OnboardingFlow />
    </ViewerProvider>
  )
}
