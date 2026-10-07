import { describe, expect, it, vi } from "vitest"

import { ApiError, ApiResponseFormatError, createApiClient } from "./index.js"

interface JsonResponseParams {
  status: number
  body: unknown
}

function jsonResponse({ status, body }: JsonResponseParams): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

describe("createApiClient", () => {
  it("calls the versioned endpoint with locale headers and returns the parsed body", async () => {
    const report = { status: "up", uptimeSeconds: 12, timestamp: "2026-10-05T12:00:00.000Z" }

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ status: 200, body: report }))

    const client = createApiClient({
      baseUrl: "https://api.ponto.test/",
      locale: "en",
      fetch: fetchMock,
    })

    await expect(client.health.liveness()).resolves.toEqual(report)

    const [url, init] = fetchMock.mock.calls[0] ?? []

    expect(url).toBe("https://api.ponto.test/api/v1/health/live")

    expect(init?.headers).toMatchObject({ "accept-language": "en" })
  })

  it("turns the standard error envelope into an ApiError", async () => {
    const body = {
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "O serviço está temporariamente indisponível.",
        details: null,
        requestId: "req-12345678",
      },
    }

    const client = createApiClient({
      baseUrl: "https://api.ponto.test",
      fetch: vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ status: 503, body })),
    })

    const error: unknown = await client.health.readiness().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)

    expect(error).toMatchObject({
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      requestId: "req-12345678",
    })
  })

  it("rejects responses that do not match the contract", async () => {
    const client = createApiClient({
      baseUrl: "https://api.ponto.test",
      fetch: vi
        .fn<typeof fetch>()
        .mockResolvedValue(jsonResponse({ status: 200, body: { status: "maybe" } })),
    })

    await expect(client.health.liveness()).rejects.toBeInstanceOf(ApiResponseFormatError)
  })

  describe("health.isReady", () => {
    const readyReport = {
      status: "up",
      checks: { database: { status: "up", latencyMs: 1 } },
      timestamp: "2026-10-05T12:00:00.000Z",
    }

    it("is true when the API reports itself ready", async () => {
      const client = createApiClient({
        baseUrl: "https://api.ponto.test",
        fetch: vi
          .fn<typeof fetch>()
          .mockResolvedValue(jsonResponse({ status: 200, body: readyReport })),
      })

      await expect(client.health.isReady()).resolves.toBe(true)
    })

    it("is false when the API is degraded or unreachable", async () => {
      const degraded = createApiClient({
        baseUrl: "https://api.ponto.test",
        fetch: vi.fn<typeof fetch>().mockResolvedValue(
          jsonResponse({
            status: 503,
            body: {
              error: { code: "SERVICE_UNAVAILABLE", message: "x", details: null, requestId: null },
            },
          }),
        ),
      })

      const unreachable = createApiClient({
        baseUrl: "https://api.ponto.test",
        fetch: vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")),
      })

      await expect(degraded.health.isReady()).resolves.toBe(false)

      await expect(unreachable.health.isReady()).resolves.toBe(false)
    })

    it("propagates cancellation instead of reporting the API as down", async () => {
      const controller = new AbortController()

      controller.abort()

      const client = createApiClient({
        baseUrl: "https://api.ponto.test",
        fetch: vi.fn<typeof fetch>().mockRejectedValue(new DOMException("Aborted", "AbortError")),
      })

      await expect(client.health.isReady(controller.signal)).rejects.toThrow("Aborted")
    })
  })

  describe("authenticated requests", () => {
    it("sends the session token as a bearer credential", async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))

      const client = createApiClient({
        baseUrl: "https://api.ponto.test",
        fetch: fetchMock,
        getSessionToken: () => "session-token-value",
      })

      await expect(client.auth.logout()).resolves.toBeUndefined()

      const [url, init] = fetchMock.mock.calls[0] ?? []

      expect(url).toBe("https://api.ponto.test/api/v1/auth/logout")

      expect(init).toMatchObject({
        method: "POST",
        headers: { authorization: "Bearer session-token-value" },
      })
    })

    it("omits the authorization header when there is no session", async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 202 }))

      const client = createApiClient({
        baseUrl: "https://api.ponto.test",
        fetch: fetchMock,
        getSessionToken: () => null,
      })

      await client.auth.requestPasswordReset({ email: "ana@example.com" })

      const [, init] = fetchMock.mock.calls[0] ?? []

      expect(init?.headers).not.toHaveProperty("authorization")

      expect(init?.body).toBe(JSON.stringify({ email: "ana@example.com" }))
    })
  })

  describe("content resources", () => {
    it("builds paginated URLs and skips missing query values", async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementation(() =>
          Promise.resolve(jsonResponse({ status: 200, body: { items: [], nextCursor: null } })),
        )

      const client = createApiClient({ baseUrl: "https://api.ponto.test", fetch: fetchMock })

      await client.posts.listByUser({ handle: "ana", query: { limit: 10 } })

      await client.follows.listFollowers({ handle: "ana", query: { cursor: "abc", limit: 5 } })

      const urls = fetchMock.mock.calls.map(([url]) => url)

      expect(urls).toEqual([
        "https://api.ponto.test/api/v1/users/ana/posts?limit=10",
        "https://api.ponto.test/api/v1/users/ana/followers?cursor=abc&limit=5",
      ])
    })

    it("targets the right collection when reacting", async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }))
      const client = createApiClient({ baseUrl: "https://api.ponto.test", fetch: fetchMock })

      await client.reactions.add({ targetType: "comment", targetId: "c1", kind: "changed_my_mind" })

      const [url, init] = fetchMock.mock.calls[0] ?? []

      expect(url).toBe("https://api.ponto.test/api/v1/comments/c1/reactions/changed_my_mind")

      expect(init?.method).toBe("PUT")
    })
  })
})
