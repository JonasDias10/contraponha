import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import { afterAll, beforeAll, describe, expect, it } from "vitest"

import { safeFetch, UnsafeTargetError } from "./safe-fetch.js"

describe("safeFetch", () => {
  let server: Server
  let port: number

  beforeAll(async () => {
    server = createServer((_request, response) => response.end("internal"))

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))

    port = (server.address() as AddressInfo).port
  })

  afterAll(() => {
    server.close()
  })

  it("refuses to reach loopback addresses, by name or by IP", async () => {
    for (const host of ["127.0.0.1", "localhost"]) {
      await expect(
        safeFetch({
          url: `http://${host}:${port}/`,
          maxBytes: 1024,
          timeoutMs: 2000,
          accept: "*/*",
        }),
      ).rejects.toThrow()
    }
  })

  it("refuses non-http protocols and credentials in the URL", async () => {
    await expect(
      safeFetch({ url: "file:///etc/passwd", maxBytes: 1024, timeoutMs: 2000, accept: "*/*" }),
    ).rejects.toBeInstanceOf(UnsafeTargetError)

    await expect(
      safeFetch({
        url: "https://user:pass@example.com",
        maxBytes: 1024,
        timeoutMs: 2000,
        accept: "*/*",
      }),
    ).rejects.toBeInstanceOf(UnsafeTargetError)
  })
})
