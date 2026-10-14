import { Injectable } from "@nestjs/common"

import { safeFetch, type FetchedResource, type SafeFetchParams } from "./safe-fetch.js"

// Fetches third-party resources for the server (link previews). Tests swap it for a fake;
// production uses safeFetch, which only reaches public addresses.
export abstract class RemoteFetcher {
  abstract fetch(params: SafeFetchParams): Promise<FetchedResource>
}

@Injectable()
export class SafeRemoteFetcher extends RemoteFetcher {
  fetch(params: SafeFetchParams): Promise<FetchedResource> {
    return safeFetch(params)
  }
}
