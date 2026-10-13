import type { NextRequest } from "next/server.js"

import { SESSION_COOKIE } from "./session.js"

const FORWARDED_REQUEST_HEADERS = ["accept", "accept-language", "content-type"] as const

const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "cache-control",
  "x-accel-buffering",
  "x-request-id",
  "retry-after",
] as const

const SAFE_METHODS = new Set(["GET", "HEAD"])

// Same-origin check for state-changing requests: the session cookie is SameSite=Lax, and
// this rejects cross-site POSTs that browsers would still send with it.
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin")
  return origin === null || origin === request.nextUrl.origin
}

export interface ApiProxyPathParams {
  path: string[]
}

export interface ApiProxyContext {
  params: Promise<ApiProxyPathParams>
}

// Route handlers receive (request, context) from Next.js; the signature is not ours to change.
export type ApiProxyHandler = (request: NextRequest, context: ApiProxyContext) => Promise<Response>

export interface CreateApiProxyParams {
  getApiUrl: () => string
}

// Backend-for-frontend proxy mounted at app/api/v1/[...path]: browser calls stay same-origin
// and the session cookie becomes the API's bearer token on the server.
export function createApiProxy({ getApiUrl }: CreateApiProxyParams): ApiProxyHandler {
  return async (request, context) => {
    if (!SAFE_METHODS.has(request.method) && !isSameOrigin(request))
      return Response.json({ error: { code: "FORBIDDEN" } }, { status: 403 })

    const { path } = await context.params
    const target = new URL(`/api/v1/${path.map(encodeURIComponent).join("/")}`, getApiUrl())

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

    // The browser's abort signal also closes the upstream request, which matters for event
    // streams that would otherwise stay open on the API.
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      signal: request.signal,
    })

    const responseHeaders = new Headers()

    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name)

      if (value) responseHeaders.set(name, value)
    }

    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
  }
}
