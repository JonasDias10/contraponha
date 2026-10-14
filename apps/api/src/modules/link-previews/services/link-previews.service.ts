import { createHash } from "node:crypto"

import { Injectable, Logger } from "@nestjs/common"
import type { LinkPreviewRow } from "@contraponha/database"
import type { LinkPreviewView } from "@contraponha/types"

import { RemoteFetcher } from "#src/infrastructure/http/remote-fetcher.js"
import { ObjectStorage } from "#src/infrastructure/storage/object-storage.js"
import { renderWebp } from "#src/modules/media/domain/image-variants.js"
import { parseOpenGraph, type OpenGraphData } from "#src/modules/link-previews/domain/open-graph.js"
import { LinkPreviewsRepository } from "#src/modules/link-previews/repositories/link-previews.repository.js"

const PAGE_MAX_BYTES = 512 * 1024
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const FETCH_TIMEOUT_MS = 5_000
const IMAGE_WIDTH = 600
const READY_TTL_MS = 7 * 24 * 60 * 60 * 1000
const FAILED_TTL_MS = 24 * 60 * 60 * 1000
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"

interface StoredImage {
  key: string
  width: number
  height: number
}

interface SaveReadyParams {
  url: string
  data: OpenGraphData
  image: StoredImage | undefined
}

interface StoreImageParams {
  url: string
  imageUrl: string
}

function isFresh(row: LinkPreviewRow): boolean {
  const ttl = row.status === "ready" ? READY_TTL_MS : FAILED_TTL_MS

  return Date.now() - row.fetchedAt.getTime() < ttl
}

@Injectable()
export class LinkPreviewsService {
  private readonly logger = new Logger(LinkPreviewsService.name)
  private readonly inFlight = new Set<string>()

  constructor(
    private readonly repository: LinkPreviewsRepository,
    private readonly storage: ObjectStorage,
    private readonly fetcher: RemoteFetcher,
  ) {}

  // Fire and forget after a post is saved: the preview shows up on the next read.
  refreshInBackground(url: string | null): void {
    if (!url || this.inFlight.has(url)) return

    this.inFlight.add(url)

    this.refresh(url)
      .catch((error: unknown) => this.logger.warn({ err: error, url }, "Link preview failed"))
      .finally(() => this.inFlight.delete(url))
  }

  async viewsFor(urls: readonly string[]): Promise<Map<string, LinkPreviewView>> {
    const rows = await this.repository.findByUrls([...new Set(urls)])

    return new Map(
      rows
        .filter(({ status }) => status === "ready")
        .map((row) => [
          row.url,
          {
            url: row.url,
            title: row.title,
            description: row.description,
            siteName: row.siteName,
            imageUrl: row.imageKey ? this.storage.publicUrl(row.imageKey) : null,
            imageWidth: row.imageWidth,
            imageHeight: row.imageHeight,
          },
        ]),
    )
  }

  private async refresh(url: string): Promise<void> {
    const [existing] = await this.repository.findByUrls([url])

    if (existing && isFresh(existing)) return

    const page = await this.fetcher
      .fetch({
        url,
        maxBytes: PAGE_MAX_BYTES,
        timeoutMs: FETCH_TIMEOUT_MS,
        accept: "text/html,application/xhtml+xml",
      })
      .catch(() => undefined)

    if (!page || !page.contentType.includes("html")) {
      if (existing?.status !== "ready") await this.saveFailed(url)

      return
    }

    const data = parseOpenGraph({
      html: Buffer.from(page.body).toString("utf8"),
      pageUrl: page.url,
    })

    if (!data.title) {
      if (existing?.status !== "ready") await this.saveFailed(url)

      return
    }

    const image = data.imageUrl
      ? await this.storeImage({ url, imageUrl: data.imageUrl })
      : undefined

    await this.saveReady({ url, data, image })

    if (existing?.imageKey && existing.imageKey !== image?.key)
      await this.storage.delete([existing.imageKey]).catch(() => undefined)
  }

  // The image is copied and re-encoded: readers never load third-party hosts, and a
  // broken or huge image on the source site does not break the card.
  private async storeImage({ url, imageUrl }: StoreImageParams): Promise<StoredImage | undefined> {
    try {
      const fetched = await this.fetcher.fetch({
        url: imageUrl,
        maxBytes: IMAGE_MAX_BYTES,
        timeoutMs: FETCH_TIMEOUT_MS,
        accept: "image/*",
      })

      if (fetched.isTruncated || !fetched.contentType.startsWith("image/")) return undefined

      const rendered = await renderWebp({ input: fetched.body, width: IMAGE_WIDTH })
      const hash = createHash("sha256").update(url).digest("hex").slice(0, 32)
      const key = `posts/previews/${hash}-${Date.now()}.webp`

      await this.storage.put({
        key,
        body: rendered.body,
        contentType: "image/webp",
        cacheControl: IMMUTABLE_CACHE_CONTROL,
      })

      return { key, width: rendered.width, height: rendered.height }
    } catch {
      return undefined
    }
  }

  private saveReady({ url, data, image }: SaveReadyParams): Promise<void> {
    return this.repository.save({
      url,
      status: "ready",
      title: data.title,
      description: data.description,
      siteName: data.siteName,
      imageKey: image?.key ?? null,
      imageWidth: image?.width ?? null,
      imageHeight: image?.height ?? null,
    })
  }

  private saveFailed(url: string): Promise<void> {
    return this.repository.save({
      url,
      status: "failed",
      title: null,
      description: null,
      siteName: null,
      imageKey: null,
      imageWidth: null,
      imageHeight: null,
    })
  }
}
