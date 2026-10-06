import { randomUUID } from "node:crypto"

import { Injectable, Logger } from "@nestjs/common"
import { minutesToMs, msToSeconds } from "@ponto/config"
import type { DatabaseExecutor } from "@ponto/database"
import { ApiErrorCode, type MediaUploadTicket, type MediaView } from "@ponto/types"

import { AppError } from "#src/common/errors/app-error.js"
import { MEDIA_UPLOAD_URL_TTL_MINUTES } from "#src/config/durations.js"
import { ObjectStorage } from "#src/infrastructure/storage/object-storage.js"
import {
  detectImageType,
  IMAGE_SIGNATURE_BYTES,
} from "#src/modules/media/domain/image-signature.js"
import { toMediaView, type MediaAsset } from "#src/modules/media/domain/media.js"
import { MediaRepository } from "#src/modules/media/repositories/media.repository.js"

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export interface CreateUploadParams {
  ownerId: string
  mimeType: string
  sizeBytes: number
}

export interface VerifyUploadsParams {
  ownerId: string
  mediaIds: readonly string[]
}

export interface AttachToPostParams {
  mediaIds: readonly string[]
  postId: string
  executor?: DatabaseExecutor
}

export interface DetachFromPostParams {
  postId: string
  executor?: DatabaseExecutor
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name)

  constructor(
    private readonly mediaRepository: MediaRepository,
    private readonly storage: ObjectStorage,
  ) {}

  async createUpload({
    ownerId,
    mimeType,
    sizeBytes,
  }: CreateUploadParams): Promise<MediaUploadTicket> {
    const storageKey = `posts/${ownerId}/${randomUUID()}.${EXTENSION_BY_TYPE[mimeType] ?? "bin"}`
    const asset = await this.mediaRepository.create({ ownerId, storageKey, mimeType, sizeBytes })
    const ttlMs = minutesToMs(MEDIA_UPLOAD_URL_TTL_MINUTES)

    const upload = await this.storage.createUploadUrl({
      key: storageKey,
      contentType: mimeType,
      contentLength: sizeBytes,
      expiresInSeconds: msToSeconds(ttlMs),
    })

    return {
      mediaId: asset.id,
      uploadUrl: upload.url,
      method: "PUT",
      headers: upload.headers,
      expiresAt: new Date(Date.now() + ttlMs).toISOString(),
    }
  }

  // Checks every upload before a post references it: owned by the author, still pending,
  // present in storage with the declared size, and really an image of the declared type.
  async verifyUploads({ ownerId, mediaIds }: VerifyUploadsParams): Promise<void> {
    if (mediaIds.length === 0) return

    const assets = await this.mediaRepository.findByIds(mediaIds)

    const isEveryAssetUsable =
      assets.length === mediaIds.length &&
      assets.every((asset) => asset.ownerId === ownerId && asset.status === "pending")

    if (!isEveryAssetUsable) throw new AppError(ApiErrorCode.MEDIA_INVALID)

    const checks = await Promise.all(assets.map((asset) => this.isStoredImage(asset)))

    if (checks.includes(false)) throw new AppError(ApiErrorCode.MEDIA_INVALID)
  }

  attachToPost({ mediaIds, postId, executor }: AttachToPostParams): Promise<void> {
    return this.mediaRepository.attach({ mediaIds, postId, executor })
  }

  async viewsForPosts(postIds: readonly string[]): Promise<Map<string, MediaView[]>> {
    const assets = await this.mediaRepository.listByPosts(postIds)
    const viewsByPost = new Map<string, MediaView[]>()

    for (const asset of assets) {
      if (!asset.postId) continue

      const views = viewsByPost.get(asset.postId) ?? []

      views.push(toMediaView({ asset, url: this.storage.publicUrl(asset.storageKey) }))

      viewsByPost.set(asset.postId, views)
    }

    return viewsByPost
  }

  detachFromPost({ postId, executor }: DetachFromPostParams): Promise<string[]> {
    return this.mediaRepository.deleteForPost({ postId, executor })
  }

  // Runs after the database change is committed; a failure leaves an orphaned object
  // behind, which is logged rather than undoing the removal.
  async deleteStoredObjects(storageKeys: readonly string[]): Promise<void> {
    try {
      await this.storage.delete(storageKeys)
    } catch (error) {
      this.logger.error({ err: error, count: storageKeys.length }, "Failed to delete media objects")
    }
  }

  private async isStoredImage(asset: MediaAsset): Promise<boolean> {
    const stored = await this.storage.head(asset.storageKey)

    if (!stored || stored.contentLength !== asset.sizeBytes) return false

    const prefix = await this.storage.readPrefix({
      key: asset.storageKey,
      bytes: IMAGE_SIGNATURE_BYTES,
    })

    return detectImageType(prefix) === asset.mimeType
  }
}
