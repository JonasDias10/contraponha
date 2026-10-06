import type { Metadata } from "next"

import { Composer } from "@/components/composer/composer"
import { ViewerProvider } from "@/components/providers/viewer-provider"
import { getRequestTranslator } from "@/lib/i18n"
import { requireViewer } from "@/lib/viewer"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.composer.newPost") }
}

export default async function ComposePage(): Promise<React.JSX.Element> {
  const viewer = await requireViewer()

  return (
    <ViewerProvider viewer={viewer}>
      <Composer />
    </ViewerProvider>
  )
}
