import type { NextRequest } from "next/server"

import { getWebEnv } from "@/lib/env"
import { SESSION_COOKIE } from "@/lib/session"

const FORWARDED_REQUEST_HEADERS = ["accept", "accept-language", "content-type"] as const
const FORWARDED_RESPONSE_HEADERS = ["content-type", "x-request-id", "retry-after"] as const
const SAFE_METHODS = new Set(["GET", "HEAD"])

// Same-origin check for state-changing requests: the session cookie is SameSite=Lax, and
// this rejects cross-site POSTs that browsers would still send with it.
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  return origin === null || origin === request.nextUrl.origin
}

// Route handlers receive (request, context) from Next.js; the signature is not ours to change.
// eslint-disable-next-line no-restricted-syntax
async function forward(
  request: NextRequest,
  context: RouteContext<"/api/v1/[...path]">,
): Promise<Response> {
  if (!SAFE_METHODS.has(request.method) && !isSameOrigin(request))
    return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 })

  const { path } = await context.params
  const target = new URL(`/api/v1/${path.map(encodeURIComponent).join("/")}`, getWebEnv().API_URL)

  target.search = request.nextUrl.search

  const headers = new Headers()

  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name)

    if (value) headers.set(name, value)
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (token) headers.set("authorization", `Bearer ${token}`)

  const forwardedFor = request.headers.get("x-forwarded-for")

  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor)

  const body = SAFE_METHODS.has(request.method) ? undefined : await request.arrayBuffer()

  const upstream = await fetch(target, { method: request.method, headers, body, cache: "no-store" })
  const responseHeaders = new Headers()

  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name)

    if (value) responseHeaders.set(name, value)
  }

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
}

export { forward as DELETE, forward as GET, forward as PATCH, forward as POST, forward as PUT }
