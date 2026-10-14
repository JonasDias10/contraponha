import type { FetchedResource, SafeFetchParams } from "#src/infrastructure/http/safe-fetch.js"
import { RemoteFetcher } from "#src/infrastructure/http/remote-fetcher.js"

export interface FakeResponse {
  contentType: string
  body: Uint8Array | string
}

export interface RespondParams {
  url: string
  response: FakeResponse
}

export class FakeRemoteFetcher extends RemoteFetcher {
  private readonly responses = new Map<string, FakeResponse>()
  readonly requested: string[] = []

  respond({ url, response }: RespondParams): void {
    this.responses.set(url, response)
  }

  fetch({ url }: SafeFetchParams): Promise<FetchedResource> {
    this.requested.push(url)

    const response = this.responses.get(url)

    if (!response) return Promise.reject(new Error(`No fake response for ${url}`))

    const body =
      typeof response.body === "string" ? new Uint8Array(Buffer.from(response.body)) : response.body

    return Promise.resolve({ url, contentType: response.contentType, body, isTruncated: false })
  }
}
