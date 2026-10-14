import { lookup, type LookupAddress } from "node:dns"

import ipaddr from "ipaddr.js"
import { Agent, request } from "undici"

import { isPublicAddress } from "./public-address.js"

const MAX_REDIRECTS = 3
const USER_AGENT = "ContraponhaBot/1.0 (+https://contraponha.app/about)"

export interface SafeFetchParams {
  url: string
  maxBytes: number
  timeoutMs: number
  accept: string
}

export interface FetchedResource {
  url: string
  contentType: string
  body: Uint8Array
  // Reading stopped at maxBytes: fine for an HTML head, not for an image.
  isTruncated: boolean
}

export class UnsafeTargetError extends Error {}

type LookupCallback = (
  error: NodeJS.ErrnoException | null,
  address: string | LookupAddress[],
  family?: number,
) => void

// The address check runs on the address actually connected to, so a hostname cannot pass
// validation and then resolve to an internal address (DNS rebinding).
// Signature imposed by net.connect's lookup option.
// eslint-disable-next-line no-restricted-syntax
function publicOnlyLookup(hostname: string, options: object, callback: LookupCallback): void {
  lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) {
      callback(error, [])

      return
    }

    const allowed = addresses.filter(({ address }) => isPublicAddress(address))

    if (allowed.length === 0) {
      callback(new UnsafeTargetError(`Refusing to connect to ${hostname}`), [])

      return
    }

    callback(null, allowed)
  })
}

// undici does not follow redirects by itself; safeFetch does, checking each hop.
const agent = new Agent({ connect: { lookup: publicOnlyLookup } })

function assertHttpUrl(value: string): URL {
  const url = new URL(value)

  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new UnsafeTargetError(`Unsupported protocol ${url.protocol}`)

  if (url.username || url.password) throw new UnsafeTargetError("Credentials in URL")

  // An IP literal is connected to without a DNS lookup, so it is checked here.
  const host = url.hostname.replace(/^\[|\]$/g, "")

  if (ipaddr.isValid(host) && !isPublicAddress(host))
    throw new UnsafeTargetError(`Refusing to connect to ${host}`)

  return url
}

// Fetches a public http(s) resource for server-side use (link previews): follows at most
// three redirects, each re-checked, and stops reading past maxBytes or timeoutMs.
export async function safeFetch({
  url,
  maxBytes,
  timeoutMs,
  accept,
}: SafeFetchParams): Promise<FetchedResource> {
  const signal = AbortSignal.timeout(timeoutMs)
  let target = assertHttpUrl(url)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const response = await request(target, {
      dispatcher: agent,
      method: "GET",
      headers: { "user-agent": USER_AGENT, accept },
      signal,
    })

    if (response.statusCode >= 300 && response.statusCode < 400) {
      const location = response.headers.location

      await response.body.dump()

      if (typeof location !== "string") throw new Error("Redirect without location")

      target = assertHttpUrl(new URL(location, target).toString())

      continue
    }

    if (response.statusCode !== 200) {
      await response.body.dump()

      throw new Error(`Unexpected status ${response.statusCode}`)
    }

    const contentType = String(response.headers["content-type"] ?? "")
    const chunks: Uint8Array[] = []
    let size = 0
    let isTruncated = false

    for await (const chunk of response.body) {
      const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(Buffer.from(String(chunk)))

      size += bytes.length

      if (size > maxBytes) {
        isTruncated = true

        response.body.destroy()

        break
      }

      chunks.push(bytes)
    }

    return {
      url: target.toString(),
      contentType,
      body: new Uint8Array(Buffer.concat(chunks)),
      isTruncated,
    }
  }

  throw new Error("Too many redirects")
}
