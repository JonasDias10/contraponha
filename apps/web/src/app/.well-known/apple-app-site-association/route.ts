import { appleAppSiteAssociation } from "@/lib/app-links"

export const dynamic = "force-dynamic"

export function GET(): Response {
  const association = appleAppSiteAssociation()

  if (!association) return new Response(null, { status: 404 })

  return Response.json(association)
}
