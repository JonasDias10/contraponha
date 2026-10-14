import { Inject, Injectable } from "@nestjs/common"
import {
  mediaAssets,
  type Database,
  type DatabaseExecutor,
  type MediaVariantValue,
} from "@contraponha/database"
import { and, asc, eq, inArray } from "drizzle-orm"

import { DATABASE } from "#src/infrastructure/database/database.module.js"
import type { MediaAsset } from "#src/modules/media/domain/media.js"

export interface CreateMediaAssetData {
  ownerId: string
  storageKey: string
  mimeType: string
  sizeBytes: number
}

export interface ProcessedMediaData {
  id: string
  width: number
  height: number
  variants: MediaVariantValue[]
}

export interface AttachMediaParams {
  media: readonly ProcessedMediaData[]
  postId: string
  executor?: DatabaseExecutor
}

export interface DeleteMediaForPostParams {
  postId: string
  executor?: DatabaseExecutor
}

export interface DeleteMediaForOwnerParams {
  ownerId: string
  executor: DatabaseExecutor
}

export interface DeleteProfilePhotosParams {
  ownerId: string
  executor: DatabaseExecutor
}

export interface MarkAsProfilePhotoParams {
  mediaId: string
  executor: DatabaseExecutor
}

interface StoredKeysRow {
  storageKey: string
  variants: MediaVariantValue[] | null
}

// Every object an asset may have in storage: the original (already gone once processed,
// deleting it again is harmless) and its variants.
function storedKeys({ storageKey, variants }: StoredKeysRow): string[] {
  return [storageKey, ...(variants ?? []).map(({ key }) => key)]
}

@Injectable()
export class MediaRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async create(data: CreateMediaAssetData): Promise<MediaAsset> {
    const [asset] = await this.db.insert(mediaAssets).values(data).returning()

    if (!asset) throw new Error("Insert into media_assets returned no row")

    return asset
  }

  findByIds(ids: readonly string[]): Promise<MediaAsset[]> {
    if (ids.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(mediaAssets)
      .where(inArray(mediaAssets.id, [...ids]))
  }

  async attach({ media, postId, executor = this.db }: AttachMediaParams): Promise<void> {
    for (const [position, { id, width, height, variants }] of media.entries()) {
      await executor
        .update(mediaAssets)
        .set({
          postId,
          position,
          status: "attached",
          attachedAt: new Date(),
          width,
          height,
          variants,
        })
        .where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, "pending")))
    }
  }

  listByPosts(postIds: readonly string[]): Promise<MediaAsset[]> {
    if (postIds.length === 0) return Promise.resolve([])

    return this.db
      .select()
      .from(mediaAssets)
      .where(inArray(mediaAssets.postId, [...postIds]))
      .orderBy(asc(mediaAssets.postId), asc(mediaAssets.position))
  }

  async deleteForPost({ postId, executor = this.db }: DeleteMediaForPostParams): Promise<string[]> {
    const deleted = await executor
      .delete(mediaAssets)
      .where(eq(mediaAssets.postId, postId))
      .returning({ storageKey: mediaAssets.storageKey, variants: mediaAssets.variants })

    return deleted.flatMap(storedKeys)
  }

  async deleteForOwner({ ownerId, executor }: DeleteMediaForOwnerParams): Promise<string[]> {
    const removed = await executor
      .delete(mediaAssets)
      .where(eq(mediaAssets.ownerId, ownerId))
      .returning({ storageKey: mediaAssets.storageKey, variants: mediaAssets.variants })

    return removed.flatMap(storedKeys)
  }

  async deleteProfilePhotos({ ownerId, executor }: DeleteProfilePhotosParams): Promise<string[]> {
    const removed = await executor
      .delete(mediaAssets)
      .where(and(eq(mediaAssets.ownerId, ownerId), eq(mediaAssets.status, "profile")))
      .returning({ storageKey: mediaAssets.storageKey, variants: mediaAssets.variants })

    return removed.flatMap(storedKeys)
  }

  async markAsProfilePhoto({
    mediaId,
    executor,
  }: MarkAsProfilePhotoParams): Promise<MediaAsset | undefined> {
    const [asset] = await executor
      .update(mediaAssets)
      .set({ status: "profile", attachedAt: new Date() })
      .where(and(eq(mediaAssets.id, mediaId), eq(mediaAssets.status, "pending")))
      .returning()

    return asset
  }
}
