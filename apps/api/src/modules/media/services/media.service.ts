import { randomUUID } from "node:crypto"

import { Injectable, Logger } from "@nestjs/common"
import { minutesToMs, msToSeconds } from "@contraponha/config"
import type { DatabaseExecutor } from "@contraponha/database"
import {
  ApiErrorCode,
  MediaPurpose,
  type MediaUploadTicket,
  type MediaView,
} from "@contraponha/types"

import { AppError } from "#src/common/errors/app-error.js"
import { MEDIA_UPLOAD_URL_TTL_MINUTES } from "#src/config/durations.js"
import { ObjectStorage } from "#src/infrastructure/storage/object-storage.js"
import {
  detectImageType,
  IMAGE_SIGNATURE_BYTES,
} from "#src/modules/media/domain/image-signature.js"
import { renderVariants } from "#src/modules/media/domain/image-variants.js"
import { toMediaView, type MediaAsset } from "#src/modules/media/domain/media.js"
import {
  MediaRepository,
  type ProcessedMediaData,
} from "#src/modules/media/repositories/media.repository.js"

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

// Variant keys are never reused, so CDNs and browsers can keep them forever.
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"

const PREFIX_BY_PURPOSE: Record<MediaPurpose, string> = {
  [MediaPurpose.POST]: "posts/",
  [MediaPurpose.AVATAR]: "avatars/",
}

export interface CreateUploadParams {
  ownerId: string
  mimeType: string
  sizeBytes: number
  purpose: MediaPurpose
}

export interface VerifyProfilePhotoParams {
  ownerId: string
  mediaId: string
}

interface IsUsableParams {
  asset: MediaAsset
  ownerId: string
  purpose: MediaPurpose
}

export interface UseAsProfilePhotoParams {
  ownerId: string
  mediaId: string
  executor: DatabaseExecutor
}

export interface ProfilePhotoChange {
  url: string
  replacedKeys: string[]
}

export interface RemoveProfilePhotoParams {
  ownerId: string
  executor: DatabaseExecutor
}

export interface VerifyUploadsParams {
  ownerId: string
  mediaIds: readonly string[]
}

export interface AttachToPostParams {
  media: readonly ProcessedMedia[]
  postId: string
  executor?: DatabaseExecutor
}

export interface ProcessedMedia extends ProcessedMediaData {
  originalKey: string
}

interface ProcessAssetParams {
  asset: MediaAsset
}

export interface DetachFromPostParams {
  postId: string
  executor?: DatabaseExecutor
}

export interface PurgeOwnerMediaParams {
  ownerId: string
  executor: DatabaseExecutor
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
    purpose,
  }: CreateUploadParams): Promise<MediaUploadTicket> {
    const extension = EXTENSION_BY_TYPE[mimeType] ?? "bin"
    const storageKey = `${PREFIX_BY_PURPOSE[purpose]}${ownerId}/${randomUUID()}.${extension}`
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
  private async verifyUploads({ ownerId, mediaIds }: VerifyUploadsParams): Promise<void> {
    if (mediaIds.length === 0) return

    const assets = await this.mediaRepository.findByIds(mediaIds)

    const isEveryAssetUsable =
      assets.length === mediaIds.length &&
      assets.every((asset) => this.isUsable({ asset, ownerId, purpose: MediaPurpose.POST }))

    if (!isEveryAssetUsable) throw new AppError(ApiErrorCode.MEDIA_INVALID)

    const checks = await Promise.all(assets.map((asset) => this.isStoredImage(asset)))

    if (checks.includes(false)) throw new AppError(ApiErrorCode.MEDIA_INVALID)
  }

  async verifyProfilePhoto({ ownerId, mediaId }: VerifyProfilePhotoParams): Promise<void> {
    const [asset] = await this.mediaRepository.findByIds([mediaId])

    if (!asset || !this.isUsable({ asset, ownerId, purpose: MediaPurpose.AVATAR }))
      throw new AppError(ApiErrorCode.MEDIA_INVALID)

    const isImage = await this.isStoredImage(asset)

    if (!isImage) throw new AppError(ApiErrorCode.MEDIA_INVALID)
  }

  // Must run in the transaction that updates the user row, which serializes concurrent
  // changes so each person keeps at most one profile photo.
  async useAsProfilePhoto({
    ownerId,
    mediaId,
    executor,
  }: UseAsProfilePhotoParams): Promise<ProfilePhotoChange> {
    const replacedKeys = await this.mediaRepository.deleteProfilePhotos({ ownerId, executor })
    const asset = await this.mediaRepository.markAsProfilePhoto({ mediaId, executor })

    if (!asset) throw new AppError(ApiErrorCode.MEDIA_INVALID)

    return { url: this.storage.publicUrl(asset.storageKey), replacedKeys }
  }

  removeProfilePhoto({ ownerId, executor }: RemoveProfilePhotoParams): Promise<string[]> {
    return this.mediaRepository.deleteProfilePhotos({ ownerId, executor })
  }

  // Verifies the uploads and renders their variants before the post is written, so a post
  // never shows an unprocessed image. Order follows mediaIds.
  async prepareForPost({ ownerId, mediaIds }: VerifyUploadsParams): Promise<ProcessedMedia[]> {
    await this.verifyUploads({ ownerId, mediaIds })

    const assets = await this.mediaRepository.findByIds(mediaIds)
    const byId = new Map(assets.map((asset) => [asset.id, asset]))
    const ordered = mediaIds.flatMap((id) => byId.get(id) ?? [])

    return Promise.all(ordered.map((asset) => this.processAsset({ asset })))
  }

  attachToPost({ media, postId, executor }: AttachToPostParams): Promise<void> {
    return this.mediaRepository.attach({ media, postId, executor })
  }

  // After the post is committed: the originals still carry the camera's metadata.
  async discardOriginals(media: readonly ProcessedMedia[]): Promise<void> {
    await this.deleteStoredObjects(media.map(({ originalKey }) => originalKey))
  }

  async viewsForPosts(postIds: readonly string[]): Promise<Map<string, MediaView[]>> {
    const assets = await this.mediaRepository.listByPosts(postIds)
    const viewsByPost = new Map<string, MediaView[]>()

    for (const asset of assets) {
      if (!asset.postId) continue

      const views = viewsByPost.get(asset.postId) ?? []

      views.push(toMediaView({ asset, publicUrl: (key) => this.storage.publicUrl(key) }))

      viewsByPost.set(asset.postId, views)
    }

    return viewsByPost
  }

  detachFromPost({ postId, executor }: DetachFromPostParams): Promise<string[]> {
    return this.mediaRepository.deleteForPost({ postId, executor })
  }

  // Runs after the database change is committed; a failure leaves an orphaned object
  // behind, which is logged rather than undoing the removal.
  // Account deletion: forgets every upload the person made, attached or not, and returns
  // the storage keys to delete after the transaction commits.
  purgeOwner({ ownerId, executor }: PurgeOwnerMediaParams): Promise<string[]> {
    return this.mediaRepository.deleteForOwner({ ownerId, executor })
  }

  async deleteStoredObjects(storageKeys: readonly string[]): Promise<void> {
    try {
      await this.storage.delete(storageKeys)
    } catch (error) {
      this.logger.error({ err: error, count: storageKeys.length }, "Failed to delete media objects")
    }
  }

  private isUsable({ asset, ownerId, purpose }: IsUsableParams): boolean {
    return (
      asset.ownerId === ownerId &&
      asset.status === "pending" &&
      asset.storageKey.startsWith(PREFIX_BY_PURPOSE[purpose])
    )
  }

  private async processAsset({ asset }: ProcessAssetParams): Promise<ProcessedMedia> {
    const original = await this.storage.read(asset.storageKey)

    const image = await renderVariants(original).catch((error: unknown) => {
      throw new AppError(ApiErrorCode.MEDIA_INVALID, { cause: error })
    })

    const base = asset.storageKey.replace(/\.[a-z]+$/, "")

    const variants = await Promise.all(
      image.variants.map(async ({ width, height, body }) => {
        const key = `${base}-w${width}.webp`

        await this.storage.put({
          key,
          body,
          contentType: "image/webp",
          cacheControl: IMMUTABLE_CACHE_CONTROL,
        })

        return { key, width, height }
      }),
    )

    return {
      id: asset.id,
      width: image.width,
      height: image.height,
      variants,
      originalKey: asset.storageKey,
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
