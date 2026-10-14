import { androidAssetLinks } from "@/lib/app-links"

export const dynamic = "force-dynamic"

export function GET(): Response {
  const statements = androidAssetLinks()

  if (!statements) return new Response(null, { status: 404 })

  return Response.json(statements)
}
