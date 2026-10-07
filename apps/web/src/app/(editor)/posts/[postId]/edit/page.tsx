import { ApiError } from "@ponto/api-client"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { Composer } from "@/components/composer/composer"
import { ViewerProvider } from "@/components/providers/viewer-provider"
import { createServerApiClient } from "@/lib/api"
import { getRequestTranslator } from "@/lib/i18n"
import { isWithinEditWindow } from "@/lib/edit-window"
import { paths } from "@/lib/paths"
import { requireViewer } from "@/lib/viewer"

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getRequestTranslator()
  return { title: t("web.composer.editTitle") }
}

export default async function EditPostPage({
  params,
}: PageProps<"/posts/[postId]/edit">): Promise<React.JSX.Element> {
  const viewer = await requireViewer()
  const { postId } = await params
  const { locale } = await getRequestTranslator()

  const post = await createServerApiClient(locale)
    .posts.get(postId)
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound()

      throw error
    })

  const isEditable =
    !post.isDeleted &&
    post.author?.id === viewer.id &&
    isWithinEditWindow({ createdAt: post.createdAt })

  if (!isEditable) redirect(paths.post(post.id))

  return (
    <ViewerProvider viewer={viewer}>
      <Composer post={post} />
    </ViewerProvider>
  )
}
