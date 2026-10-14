import { getRequestTranslator } from "@contraponha/next-server"
import type { ImageResponse } from "next/og"

import { loadProfile } from "@/lib/load-profile"
import { OG_SIZE, renderOgCard } from "@/lib/og-card"

export const size = OG_SIZE
export const contentType = "image/png"

export default async function Image({ params }: PageProps<"/u/[handle]">): Promise<ImageResponse> {
  const { handle } = await params

  const [profile, { t }] = await Promise.all([
    loadProfile(decodeURIComponent(handle)),
    getRequestTranslator(),
  ])

  return renderOgCard({
    eyebrow: `@${profile.handle}`,
    title: profile.displayName,
    byline: profile.headline ?? profile.bio ?? t("app.tagline"),
  })
}
